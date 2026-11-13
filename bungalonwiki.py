import os
import sys
import webview

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(BASE_DIR, "index.html")
if not os.path.exists(INDEX_HTML):
    INDEX_HTML = os.path.join(getattr(sys, "_MEIPASS", BASE_DIR), "index.html")

if __name__ == "__main__":
    webview.create_window(
        "BuglonWiki",
        INDEX_HTML,
        width=1100,
        height=750,
        min_size=(800, 500),
        background_color="#fafaf7",
    )
    webview.start()
