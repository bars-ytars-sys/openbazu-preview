# -*- coding: utf-8 -*-
"""Лента новостей сайта из Telegram-канала @openbaza (25.09).

Арсений: «новостная лента на сайте, чтобы дублировались из тг канала, тип форум но без комментариев».
Берёт публичную веб-ленту канала https://t.me/s/openbaza (без бота и токена), листает назад (?before=),
разбирает посты: текст, фото и альбомы, видео и «кружки» (обложка + длительность), голосовые, опросы,
превью ссылок (выпуски на YouTube), дату и просмотры. Картинки качает и ужимает в webp (до 960 px).
Рубрику ставит по словам текста (хэштегов в канале нет). Видео не качаем — на сайте обложка и переход в Telegram.

Проверки перед показом (правила сайта):
- пост с кадастровым номером — не показываем (приватное клиента);
- пост, где рядом «бесплатн…» и «разбор/консультац…», — не показываем (бесплатных разборов не обещаем;
  бесплатный вебинар 3 октября — можно);
- номера из скрыть.txt — не показываем (по одному на строку, после # — комментарий).
Скрытые с причиной — в лента.json → «скрыто».

Результат: лента.json и картинки/ рядом со скриптом.
Только новостные посты (25.09 Арсений): без кружков и опросов — переключатель «лента-без-кружков-опросов» в правки.txt.

Запуск: python собрать-ленту.py [сколько постов, по умолчанию 60]
"""
import html as H
import argparse
import io
import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8")
ТУТ = os.path.dirname(os.path.abspath(__file__))
ИСХОДНИК = ТУТ
КАНАЛ = "openbaza"
СКОЛЬКО = 60
КАРТИНКИ = os.path.join(ТУТ, "картинки")
ПРОКСИ = "http://127.0.0.1:12334"   # запасной путь, если прямой запрос не прошёл


def получить(url, двоичный=False):
    ошибка = None
    for прокси in (None, ПРОКСИ):
        try:
            откр = urllib.request.build_opener(*([urllib.request.ProxyHandler({"https": прокси, "http": прокси})] if прокси else []))
            r = откр.open(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}), timeout=40)
            д = r.read()
            return д if двоичный else д.decode("utf-8", "replace")
        except Exception as e:
            ошибка = e
    raise ошибка


def фон(кусок):
    """Адреса background-image:url('...') в куске, кроме эмодзи."""
    return [u for u in re.findall(r"background-image:url\('([^']+)'\)", кусок) if "/img/emoji/" not in u]


def чистый_html(т):
    """Текст поста → безопасный HTML: только b, i, u, s, a, br, blockquote, code; эмодзи — символом."""
    т = re.sub(r'<i class="emoji"[^>]*><b>(.*?)</b></i>', r"\1", т, flags=re.S)
    т = re.sub(r"<tg-emoji[^>]*>(.*?)</tg-emoji>", r"\1", т, flags=re.S)
    т = re.sub(r"<br\s*/?>", "<br>", т)

    def тег(m):
        закр, имя, атр = m.group(1), m.group(2).lower(), m.group(3) or ""
        имя = {"strong": "b", "em": "i", "del": "s", "ins": "u"}.get(имя, имя)
        if имя not in ("b", "i", "u", "s", "a", "br", "blockquote", "code", "pre"):
            return ""
        if имя == "a" and not закр:
            href = re.search(r'href="([^"]+)"', атр)
            ссылка = H.unescape(href.group(1)) if href else ""
            if not re.match(r"https?://", ссылка):
                return "<a>"
            return f'<a href="{H.escape(ссылка, quote=True)}" target="_blank" rel="noopener nofollow">'
        return f"<{закр}{имя}>"

    т = re.sub(r"<(/?)([a-zA-Z0-9-]+)([^>]*)>", тег, т)
    т = re.sub(r"(<br>\s*){3,}", "<br><br>", т).strip()
    return re.sub(r"^(<br>)+|(<br>)+$", "", т)


def простой(т):
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<br>", "\n", re.sub(r"<(?!br>)[^>]+>", "", т)))).strip()


def _обрезать_значки(с):
    """Эмодзи и значки по краям строки прочь; буквы, цифры, кавычки и скобки остаются."""
    хорошие = "«»\"„“”()"
    while с and not (с[0].isalnum() or с[0] in хорошие):
        с = с[1:]
    while с and not (с[-1].isalnum() or с[-1] in хорошие + ".!?…"):
        с = с[:-1]
    return re.sub(r"\s+([!?.])", r"\1", с).strip()


def _регистр(с):
    """ЗАГОЛОВОК ЗАГЛАВНЫМИ → обычный регистр; имя в «кавычках» и начало фразы — с заглавной."""
    буквы = [ч for ч in с if ч.isalpha()]
    if not буквы or sum(ч.isupper() for ч in буквы) / len(буквы) < 0.8:
        return с
    с = с.lower()
    с = re.sub(r"(^|[.!?]\s+|«)(\w)", lambda м: м.group(1) + м.group(2).upper(), с)
    return с


def заголовок_и_тело(html_текст):
    """Первая строка поста — заголовок, если короткая; иначе заголовка нет (пост как заметка)."""
    строки = html_текст.split("<br>")
    первая = _обрезать_значки(простой(строки[0]))
    if 6 <= len(первая) <= 120 and len(строки) > 1:
        return _регистр(первая), "<br>".join(строки[1:]).strip()
    return "", html_текст


# Рубрика: сначала по заголовку (он точнее), потом по началу текста. Хэштегов в канале нет.
ПО_ЗАГОЛОВКУ = [
    ("Отзывы", r"отзыв"),
    ("События", r"вебинар|форум|выступ|встреч|конференц|выставк|эфир"),
    ("Новости отрасли", r"госдум|закон|эксперимент|министерств|правительств|обязаны|ликвидац|подрядчик|реестр|налог|яндекс|росстат|минэк"),
    ("Стройка", r"(?<!за)стройк|строительств|отч[её]т|финишн"),
    ("Разборы", r"консультац|разбор|осмотр"),
    ("Видео и подкасты", r"подкаст|выпуск|ролик|youtube"),
    ("Проекты", r"реализовал|теперь в «|наш\w* (?:объект|проект)"),
]
ПО_ТЕКСТУ = [
    ("Отзывы", r"видеоотзыв|отзыв от"),
    ("События", r"вебинар|форум|выступил"),
    ("Новости отрасли", r"госдум|ри[аa] новости|законопроект|эксперимент"),
    ("Стройка", r"(?<!за)стройк|строительство выходит|на объекте"),
    ("Разборы", r"выездн\w+ консультац|консультаци\w* на участке"),
]


def рубрика(заголовок, текст, пост):
    з, т = заголовок.lower(), текст.lower()[:400]
    for имя, шаблон in ПО_ЗАГОЛОВКУ:
        if re.search(шаблон, з):
            return имя
    if пост.get("опрос"):
        return "Опросы"
    if пост.get("превью_ссылки") or пост.get("голос") or (not текст and any(м["тип"] == "кружок" for м in пост.get("медиа", []))):
        return "Видео и подкасты"
    for имя, шаблон in ПО_ТЕКСТУ:
        if re.search(шаблон, т):
            return имя
    if заголовок and (заголовок.rstrip().endswith("?") or re.match(r"(как|почему|зачем|что|чем|какие|какой|какая|сколько)\b", з)):
        return "Советы"
    return "Заметки"


def число_просмотров(т):
    т = т.strip().upper().replace(",", ".")
    м = re.match(r"([\d.]+)\s*([KM]?)", т)
    if not м:
        return 0
    return int(float(м.group(1)) * {"": 1, "K": 1000, "M": 1000000}[м.group(2)])


def картинка(url, имя):
    """Скачать и ужать в webp до 960 px по ширине. Вернуть (путь для сайта, w, h) или None."""
    from PIL import Image
    путь = os.path.join(КАРТИНКИ, имя + ".webp")
    if not os.path.exists(путь):
        try:
            д = получить(url if url.startswith("http") else "https:" + url, двоичный=True)
            и = Image.open(io.BytesIO(д)).convert("RGB")
            if и.width > 960:
                и = и.resize((960, round(и.height * 960 / и.width)), Image.LANCZOS)
            временный = путь + ".tmp"
            и.save(временный, "WEBP", quality=80, method=6)
            os.replace(временный, путь)
        except Exception as e:
            raise RuntimeError(f"Не удалось подготовить картинку {имя}: {type(e).__name__}") from None
    from PIL import Image
    with Image.open(путь) as и:
        return {"файл": "news/" + имя + ".webp", "w": и.width, "h": и.height}


def разобрать_пост(кусок):
    м = re.search(rf'data-post="{КАНАЛ}/(\d+)"', кусок)
    if not м or "service_message" in кусок:
        return None
    п = {"id": int(м.group(1)), "ссылка": f"https://t.me/{КАНАЛ}/{м.group(1)}"}
    д = re.search(r'<time datetime="([^"]+)"', кусок)
    п["дата"] = д.group(1) if д else ""
    в = re.search(r'tgme_widget_message_views">([^<]+)<', кусок)
    п["просмотры"] = число_просмотров(в.group(1)) if в else 0
    т = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', кусок, re.S)
    html_текст = чистый_html(т.group(1)) if т else ""
    медиа = []
    # альбомы и одиночные фото
    for м2 in re.finditer(r'<a class="tgme_widget_message_photo_wrap[^"]*"[^>]*style="[^"]*background-image:url\(\'([^\']+)\'\)', кусок):
        медиа.append({"тип": "фото", "url": м2.group(1)})
    for м2 in re.finditer(r'<i class="tgme_widget_message_video_thumb"[^>]*background-image:url\(\'([^\']+)\'\)', кусок):
        медиа.append({"тип": "видео", "url": м2.group(1)})
    длит = re.findall(r'class="message_video_duration[^"]*">([^<]+)<', кусок)
    for i, м2 in enumerate([x for x in медиа if x["тип"] == "видео"]):
        if i < len(длит):
            м2["длит"] = длит[i].strip()
    if "tgme_widget_message_roundvideo" in кусок:
        обл = re.search(r'tgme_widget_message_roundvideo_thumb"[^>]*background-image:url\(\'([^\']+)\'\)', кусок)
        дл = re.search(r'roundvideo_duration[^"]*">([^<]+)<', кусок)
        медиа.append({"тип": "кружок", "url": обл.group(1) if обл else "", "длит": дл.group(1).strip() if дл else ""})
    п["медиа"] = медиа
    if "tgme_widget_message_voice" in кусок:
        дл = re.search(r'voice_duration[^"]*">([^<]+)<', кусок)
        п["голос"] = {"длит": дл.group(1).strip() if дл else ""}
    if "tgme_widget_message_poll" in кусок:
        вопрос = re.search(r'tgme_widget_message_poll_question">(.*?)</div>', кусок, re.S)
        варианты = re.findall(r'poll_option_percent">(\d+)%</div>.*?poll_option_text">(.*?)</div>', кусок, re.S)
        п["опрос"] = {"вопрос": простой(вопрос.group(1)) if вопрос else "",
                      "варианты": [[простой(т2), int(пр)] for пр, т2 in варианты]}
    док = re.search(r'tgme_widget_message_document_title[^"]*"[^>]*>(.*?)</div>\s*<div class="tgme_widget_message_document_extra"[^>]*>(.*?)</div>', кусок, re.S)
    if док:
        п["файл"] = {"имя": простой(док.group(1)), "размер": простой(док.group(2))}
    реакции = re.findall(r'<span class="tgme_reaction">(?:<i class="emoji"[^>]*><b>(.*?)</b></i>|<b>(.*?)</b>)?\s*(\d+(?:\.\d+)?K?)</span>', кусок)
    if реакции:
        п["реакции"] = [[(а or б).strip(), число_просмотров(ч)] for а, б, ч in реакции if (а or б).strip()]
    пр = re.search(r'<a class="tgme_widget_message_link_preview" href="([^"]+)"(.*?)</a>', кусок, re.S)
    if пр:
        внутри = пр.group(2)
        def поле(кл):
            м3 = re.search(rf'class="{кл}"[^>]*>(.*?)</div>', внутри, re.S)
            return простой(м3.group(1)) if м3 else ""
        п["превью_ссылки"] = {"url": H.unescape(пр.group(1)), "сайт": поле("link_preview_site_name"),
                              "заголовок": поле("link_preview_title"), "описание": поле("link_preview_description")[:240],
                              "картинка_url": (фон(внутри) or [""])[0]}
    п["заголовок"], тело = заголовок_и_тело(html_текст)
    if not п["заголовок"]:
        if п.get("опрос"):
            п["заголовок"] = _обрезать_значки(п["опрос"]["вопрос"])
        elif any(x["тип"] == "кружок" for x in медиа):
            п["заголовок"] = "Видеосообщение из канала"
        elif п.get("голос"):
            п["заголовок"] = "Голосовое из канала"
        elif п.get("превью_ссылки"):
            п["заголовок"] = п["превью_ссылки"]["заголовок"]
    if п.get("превью_ссылки", {}).get("заголовок") and (not п["заголовок"] or п["заголовок"].lower().startswith("друзья")):
        п["заголовок"] = _регистр(_обрезать_значки(п["превью_ссылки"]["заголовок"]))
        тело = html_текст
    п["html"] = тело
    п["текст"] = простой(html_текст)
    return п


def проверки(п):
    т = (п["текст"] + " " + json.dumps(п.get("опрос", ""), ensure_ascii=False)).lower()
    if re.search(r"\b\d{2}:\d{2}:\d{6,7}:\d+\b", т):
        return "кадастровый номер"
    if re.search(r"бесплатн\w*[^.!?\n]{0,60}(разбор|консультац)|(разбор|консультац)\w*[^.!?\n]{0,60}бесплатн", т):
        return "обещание бесплатного разбора/консультации"
    return None


def _флаг(имя, по_умолчанию=True):
    """Строка-переключатель из правки.txt: «имя = да/нет»."""
    try:
        for стр in io.open(os.path.join(ИСХОДНИК, "..", "..", "правки.txt"), encoding="utf-8"):
            м = re.match(rf"\s*{re.escape(имя)}\s*=\s*(да|нет)\b", стр)
            if м:
                return м.group(1) == "да"
    except OSError:
        pass
    return по_умолчанию


БЕЗ_КРУЖКОВ_ОПРОСОВ = _флаг("лента-без-кружков-опросов")


def не_новость(п):
    """25.09 Арсений: «только новостные посты, кружки и опросы не нужны» — убираем ровно кружки и опросы."""
    if not БЕЗ_КРУЖКОВ_ОПРОСОВ:
        return None
    if п.get("опрос"):
        return "опрос"
    if any(м["тип"] == "кружок" for м in п["медиа"]):
        return "кружок"
    return None


def main():
    os.makedirs(КАРТИНКИ, exist_ok=True)
    скрыть = set()
    ф = os.path.join(ИСХОДНИК, "скрыть.txt")
    if os.path.exists(ф):
        for стр in io.open(ф, encoding="utf-8"):
            стр = стр.split("#")[0].strip()
            if стр.isdigit():
                скрыть.add(int(стр))
    путь_ленты = os.path.join(ТУТ, "лента.json")
    прежняя = None
    if os.path.exists(путь_ленты):
        with io.open(путь_ленты, encoding="utf-8") as файл:
            прежняя = json.load(файл)

    def подходит(п):
        return (not не_новость(п) and п["id"] not in скрыть and not проверки(п)
                and bool(п["текст"] or п["медиа"] or п.get("опрос") or п.get("превью_ссылки") or п.get("голос") or п.get("файл")))

    посты, before, канал, страниц = {}, None, {}, 0
    while sum(1 for x in посты.values() if подходит(x)) < СКОЛЬКО and страниц < 25:
        страниц += 1
        h = получить(f"https://t.me/s/{КАНАЛ}" + (f"?before={before}" if before else ""))
        if not канал:
            имя = re.search(r'<div class="tgme_channel_info_header_title"><span dir="auto">(.*?)</span>', h, re.S)
            счёт = re.search(r'counter_value">([^<]+)</span> <span class="counter_type">subscribers', h)
            ава = re.search(r'<i class="tgme_page_photo_image[^"]*"[^>]*><img src="([^"]+)"', h)
            описание = re.search(r'<div class="tgme_channel_info_description">(.*?)</div>', h, re.S)
            канал = {"ник": КАНАЛ, "имя": простой(имя.group(1)) if имя else КАНАЛ,
                     "подписчиков": число_просмотров(счёт.group(1)) if счёт else 0,
                     "описание": простой(чистый_html(описание.group(1))) if описание else "",
                     "аватар_url": ава.group(1) if ава else ""}
        куски = re.split(r'<div class="tgme_widget_message_wrap', h)[1:]
        новые = [п for п in (разобрать_пост(к) for к in куски) if п]
        if not новые:
            raise RuntimeError("Telegram вернул пустую или нераспознанную страницу; рабочая лента сохранена")
        if any(not п["дата"] for п in новые):
            raise RuntimeError("В ответе Telegram отсутствуют даты; рабочая лента сохранена")
        следующий = min(п["id"] for п in новые)
        if before is not None and следующий >= before:
            raise RuntimeError("Telegram повторил страницу вместо следующей; рабочая лента сохранена")
        for п in новые:
            посты[п["id"]] = п
        before = следующий
        time.sleep(1.2)
    if sum(1 for x in посты.values() if подходит(x)) < СКОЛЬКО:
        raise RuntimeError("Не удалось собрать полную ленту; рабочая лента сохранена")
    свежие_id = [п["id"] for п in посты.values() if подходит(п)]
    прежние_id = [п["id"] for п in (прежняя or {}).get("посты", []) if подходит(п)]
    if прежние_id and max(свежие_id) < max(прежние_id):
        raise RuntimeError("Telegram вернул более старую ленту; рабочая лента сохранена")
    посты = sorted(посты.values(), key=lambda п: -п["id"])
    скрыто, показ, мимо = [], [], {}
    for п in посты:
        if len(показ) >= СКОЛЬКО:
            break
        нн = не_новость(п)
        if нн:
            мимо[нн] = мимо.get(нн, 0) + 1
            continue
        почему = "в скрыть.txt" if п["id"] in скрыть else проверки(п)
        if почему:
            скрыто.append({"id": п["id"], "почему": почему})
            continue
        if not (п["текст"] or п["медиа"] or п.get("опрос") or п.get("превью_ссылки") or п.get("голос") or п.get("файл")):
            continue
        for i, м in enumerate(п["медиа"]):
            if м["тип"] != "фото" and _флаг("лента-превью"):   # кадры видео 180×320 и с лицами в случайный момент — не качаем (правки.txt: лента-превью)
                м.pop("url", None)
                continue
            if м.get("url"):
                к = картинка(м.pop("url"), f"{п['id']}-{i + 1}")
                if к:
                    м.update(к)
            else:
                м.pop("url", None)
        п["медиа"] = [м for м in п["медиа"] if м.get("файл") or м["тип"] != "фото"]
        if п.get("превью_ссылки", {}).get("картинка_url"):
            к = картинка(п["превью_ссылки"].pop("картинка_url"), f"{п['id']}-p")
            if к:
                п["превью_ссылки"]["картинка"] = к
        else:
            п.get("превью_ссылки", {}).pop("картинка_url", None)
        п["рубрика"] = рубрика(п["заголовок"], п["текст"], п)
        п["знаков"] = len(п["текст"])
        показ.append(п)
    if канал.get("аватар_url"):
        к = картинка(канал.pop("аватар_url"), "avatar")
        if к:
            канал["аватар"] = к["файл"]
    канал["обновлено"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    лента = {"канал": канал, "посты": показ, "скрыто": скрыто}
    временный = путь_ленты + ".tmp"
    with io.open(временный, "w", encoding="utf-8") as файл:
        json.dump(лента, файл, ensure_ascii=False, indent=1)
        файл.flush()
        os.fsync(файл.fileno())
    os.replace(временный, путь_ленты)
    from collections import Counter
    print(f"канал {канал['имя']} · подписчиков {канал['подписчиков']} · постов в ленте {len(показ)}, скрыто {len(скрыто)}")
    print("рубрики:", Counter(п["рубрика"] for п in показ).most_common())
    print("не новости (не показываем):", мимо, "· с", показ[-1]["дата"][:10] if показ else "—")
    нужные = {м["файл"].split("/")[-1] for x in показ for м in x["медиа"] if м.get("файл")}
    нужные |= {x["превью_ссылки"]["картинка"]["файл"].split("/")[-1] for x in показ if x.get("превью_ссылки", {}).get("картинка")}
    if канал.get("аватар"):
        нужные.add(канал["аватар"].split("/")[-1])
    # Старые картинки могут использоваться уже открытой страницей или предыдущей
    # версией CDN. Автоматическое обновление ничего из них не удаляет.
    print(f"картинок в текущей ленте {len(нужные)}")
    for с in скрыто:
        print(f"   скрыт {с['id']}: {с['почему']}")


if __name__ == "__main__":
    аргументы = argparse.ArgumentParser(description=__doc__)
    аргументы.add_argument("count", nargs="?", type=int, default=60)
    аргументы.add_argument("--output-dir", help="Отдельная папка для лента.json и картинки/")
    опции = аргументы.parse_args()
    if опции.count < 1:
        аргументы.error("Количество постов должно быть больше нуля")
    СКОЛЬКО = опции.count
    if опции.output_dir:
        ТУТ = os.path.abspath(опции.output_dir)
        КАРТИНКИ = os.path.join(ТУТ, "картинки")
    try:
        main()
    except Exception as ошибка:
        # Сетевое исключение может содержать URL; публичный CI не печатает ответ
        # Telegram или исходный текст скрытых публикаций.
        print(f"Обновление отменено ({type(ошибка).__name__}); рабочая лента сохранена", file=sys.stderr)
        sys.exit(1)
