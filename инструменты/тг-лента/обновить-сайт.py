# -*- coding: utf-8 -*-
"""Обновляет только assets/news; запускается локально и из GitHub Actions."""
import argparse
import copy
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
CDN = "https://cdn.jsdelivr.net/gh/bars-ytars-sys/openbazu-preview@main/assets/news/feed.json"


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate(feed, previous, images):
    posts = feed.get("посты", [])
    if feed.get("канал", {}).get("ник") != "openbaza" or len(posts) != 60:
        raise ValueError("Ожидается канал openbaza и 60 проверенных постов")
    ids = [p["id"] for p in posts]
    if ids != sorted(set(ids), reverse=True):
        raise ValueError("Дубли или неправильный порядок постов")
    if previous and ids[0] < previous["посты"][0]["id"]:
        raise ValueError("Telegram вернул старую ленту; рабочая версия сохранена")
    files = set(re.findall(r'"(?:файл|аватар)":"(news/[^"\\]+\.webp)"', json.dumps(feed, ensure_ascii=False, separators=(",", ":"))))
    for name in files:
        path = Path(name)
        if len(path.parts) != 2 or path.parts[0] != "news" or not (images / path.name).is_file():
            raise ValueError("Не найдена картинка ленты")
    return files


def comparable(feed):
    result = copy.deepcopy(feed)
    result.get("канал", {}).pop("обновлено", None)
    return result


def update(repo):
    flag = repo / "правки.txt"
    if not flag.exists() or not re.search(r"(?m)^лента-автообновление\s*=\s*да\b", flag.read_text(encoding="utf-8")):
        print("Автообновление выключено в правки.txt")
        return
    target = repo / "assets" / "news"
    previous = read(target / "feed.json")
    with tempfile.TemporaryDirectory(prefix="openbaza-news-") as tmp:
        stage = Path(tmp)
        images = stage / "картинки"
        images.mkdir()
        shutil.copy2(target / "feed.json", stage / "лента.json")
        for image in target.glob("*.webp"):
            shutil.copy2(image, images / image.name)
        subprocess.run([sys.executable, str(HERE / "собрать-ленту.py"), "60", "--output-dir", str(stage)], check=True)
        raw = read(stage / "лента.json")
        feed = {"канал": raw["канал"], "посты": raw["посты"]}
        files = validate(feed, previous, images)
        if comparable(feed) == comparable(previous):
            print("Лента уже актуальна")
            return
        # Старые картинки не удаляем: открытые вкладки ещё могут обращаться к ним.
        for name in files:
            shutil.copy2(images / Path(name).name, target / Path(name).name)
        staged_feed = target / "feed.json.tmp"
        staged_feed.write_text(json.dumps(feed, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        staged_feed.replace(target / "feed.json")
        print(f"Готово: {len(feed['посты'])} постов, последний {feed['посты'][0]['id']}")


def purge(repo):
    expected = read(repo / "assets/news/feed.json")
    url = CDN.replace("cdn.jsdelivr.net", "purge.jsdelivr.net")
    for attempt in range(8):
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                result = json.load(response)
            if result.get("status") != "finished":
                raise RuntimeError("CDN ещё не закончил сброс кеша")
            with urllib.request.urlopen(CDN, timeout=30) as response:
                actual = json.load(response)
            if actual != expected:
                raise RuntimeError("CDN пока отдаёт предыдущую версию")
            print(f"CDN проверен: последний пост {actual['посты'][0]['id']}")
            return
        except Exception as exc:
            print(f"CDN, попытка {attempt + 1}: {type(exc).__name__}")
            if attempt == 7:
                raise RuntimeError("Не удалось подтвердить обновление CDN") from None
            time.sleep(20)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=HERE.parents[1])
    parser.add_argument("--purge", action="store_true")
    args = parser.parse_args()
    (purge if args.purge else update)(args.repo.resolve())
