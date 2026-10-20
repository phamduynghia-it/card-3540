/**
 * ==========================================================================
 * BÊN NHẬN DỮ LIỆU XEM TRƯỚC (GIFT PREVIEW RECEIVER)
 * Nhúng file này vào trang index.html
 * Theo chuẩn tài liệu docs/NUT_XEM_TRUOC_TRANG_TAO.md
 * ==========================================================================
 */
(function () {
  const STORAGE_KEY = "loveMatrixPreview";
  const DB_NAME = "loveMatrixPreview";
  const STORE = "preview";
  const RECORD = "current";

  // 1. Kiểm tra URL param ?preview=1
  function isPreviewMode() {
    return new URLSearchParams(window.location.search).get("preview") === "1";
  }

  // 2. Mở IndexedDB
  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // 3. Đọc dữ liệu từ IndexedDB (trường hợp vượt hạn mức 5MB của sessionStorage)
  function loadFromIdb() {
    return openDb()
      .then((db) => {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE, "readonly");
          const get = tx.objectStore(STORE).get(RECORD);
          get.onsuccess = () => resolve(get.result || null);
          get.onerror = () => resolve(null);
        });
      })
      .catch(() => null);
  }

  // 4. Đóng dấu Watermark "BẢN XEM TRƯỚC"
  function applyDemoWatermark() {
    document.documentElement.classList.add("is-demo");
    if (document.querySelector(".demo-watermark")) return;
    const wrap = document.createElement("div");
    wrap.className = "demo-watermark";
    wrap.setAttribute("aria-hidden", "true");
    const inner = document.createElement("div");
    inner.className = "demo-watermark-inner";
    for (let i = 0; i < 48; i++) {
      const mark = document.createElement("span");
      mark.textContent = "BẢN XEM TRƯỚC";
      inner.appendChild(mark);
    }
    wrap.appendChild(inner);
    if (document.body) {
      document.body.appendChild(wrap);
    } else {
      document.addEventListener("DOMContentLoaded", () => document.body.appendChild(wrap));
    }
  }

  // 5. Cập nhật giao diện & nạp dữ liệu vào sân khấu 3D
  function setPreview(preview) {
    if (!preview) return;
    window.LoveMatrixPreview = preview;
    window.LOVE_VERSE_PREVIEW_DATA = preview;

    // Trích xuất câu chúc và đồng bộ ngay vào __SERVER_DATA__
    const msgs = preview.messages || preview.wishes || (preview.loveRain && preview.loveRain.messages) || (preview.loveRain && preview.loveRain.wishes);
    if (Array.isArray(msgs) && msgs.length > 0) {
      window.__SERVER_DATA__ = window.__SERVER_DATA__ || {};
      window.__SERVER_DATA__.messages = msgs.filter((m) => typeof m === "string" && m.trim().length > 0);
      if (typeof window.setLoveGiftData === "function") {
        window.setLoveGiftData({ messages: window.__SERVER_DATA__.messages });
      }
    }

    if (typeof window.setLoveVerseData === "function") {
      window.setLoveVerseData(preview);
    }

    document.documentElement.classList.add("is-preview");
    if (preview.heartEnabled === false) {
      document.documentElement.classList.add("is-no-heart");
    }
    if (preview.universeEnabled === false || (preview.loveRain && preview.loveRain.enabled === false)) {
      document.documentElement.classList.add("is-no-universe");
    }
    return preview;
  }

  // KHỞI ĐỘNG
  if (!isPreviewMode()) return;

  // Kích hoạt Watermark
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDemoWatermark);
  } else {
    applyDemoWatermark();
  }

  // A. Thử đọc nhanh từ SessionStorage trước
  try {
    const raw = sessionStorage.getItem("LOVE_VERSE_PREVIEW") || sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      setPreview(parsed);
      window._loveMatrixPreviewReady = Promise.resolve(parsed);
      return;
    }
  } catch (err) {}

  // B. Fallback: Nếu không có trong sessionStorage, đọc tiếp từ IndexedDB
  window._loveMatrixPreviewReady = loadFromIdb().then((data) => {
    if (data) setPreview(data);
    return data;
  });
})();
