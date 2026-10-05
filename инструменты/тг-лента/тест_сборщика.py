# -*- coding: utf-8 -*-
"""Защита автоматического обновления от неполной загрузки и утечки скрытых постов."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.stdout.reconfigure(encoding="utf-8")
SPEC = importlib.util.spec_from_file_location("collector", Path(__file__).with_name("собрать-ленту.py"))
collector = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(collector)


def message(post_id, text="Обычная новость", photo=False):
    image = '<a class="tgme_widget_message_photo_wrap" style="background-image:url(\'https://example.org/photo.jpg\')"></a>' if photo else ""
    return (f'<div class="tgme_widget_message_wrap"><div data-post="openbaza/{post_id}">'
            f'<time datetime="2026-10-04T07:17:34+00:00"></time>{image}'
            f'<div class="tgme_widget_message_text">{text}</div></div></div>')


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        self.old = {"канал": {"имя": "openbaza"}, "посты": [collector.разобрать_пост(message(1))], "скрыто": []}
        self.feed = self.directory / "лента.json"
        self.feed.write_text(json.dumps(self.old, ensure_ascii=False), encoding="utf-8")
        self.before = self.feed.read_bytes()
        self.stack = contextlib.ExitStack()
        self.addCleanup(self.stack.close)
        self.addCleanup(self.temp.cleanup)
        for name, value in (("ТУТ", str(self.directory)), ("ИСХОДНИК", str(self.directory)),
                            ("КАРТИНКИ", str(self.directory / "картинки")), ("СКОЛЬКО", 2)):
            self.stack.enter_context(patch.object(collector, name, value))
        self.stack.enter_context(patch.object(collector.time, "sleep"))

    def run_collector(self, pages):
        output = io.StringIO()
        with patch.object(collector, "получить", side_effect=pages), contextlib.redirect_stdout(output):
            collector.main()
        return output.getvalue()

    def assert_preserved(self, pages):
        with self.assertRaises(RuntimeError):
            self.run_collector(pages)
        self.assertEqual(self.feed.read_bytes(), self.before)

    def test_empty_response_preserves_feed_and_images(self):
        images = self.directory / "картинки"
        images.mkdir()
        retained = images / "old.webp"
        retained.write_bytes(b"old image")
        self.assert_preserved(["<html>Unavailable</html>"])
        self.assertTrue(retained.exists())

    def test_partial_response_preserves_feed(self):
        self.assert_preserved([message(4), "<html>Unavailable</html>"])

    def test_repeated_page_preserves_feed(self):
        self.assert_preserved([message(4), message(4)])

    def test_stale_response_preserves_feed(self):
        with patch.object(collector, "СКОЛЬКО", 1):
            self.assert_preserved([message(0)])

    def test_failed_photo_preserves_feed(self):
        with patch.object(collector, "картинка", side_effect=RuntimeError("Image unavailable")):
            self.assert_preserved([message(4, photo=True) + message(3)])

    def test_complete_feed_excludes_private_text_from_data_and_logs(self):
        secret = "Секретный клиентский участок 77:01:1234567:89"
        output = self.run_collector([message(6, secret) + message(5) + message(4)])
        result = json.loads(self.feed.read_text(encoding="utf-8"))
        self.assertEqual([post["id"] for post in result["посты"]], [5, 4])
        self.assertEqual(result["скрыто"], [{"id": 6, "почему": "кадастровый номер"}])
        self.assertNotIn(secret, self.feed.read_text(encoding="utf-8") + output)
        self.assertNotIn("77:01:1234567:89", self.feed.read_text(encoding="utf-8") + output)

    def test_cached_photo_does_not_need_network(self):
        from PIL import Image
        images = self.directory / "картинки"
        images.mkdir()
        Image.new("RGB", (20, 30)).save(images / "4-1.webp", "WEBP")
        with patch.object(collector, "получить", side_effect=AssertionError("Network must not be called")):
            photo = collector.картинка("https://example.org/photo.jpg", "4-1")
        self.assertEqual(photo, {"файл": "news/4-1.webp", "w": 20, "h": 30})


if __name__ == "__main__":
    unittest.main()
