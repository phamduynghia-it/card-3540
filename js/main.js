/**
 * ============================================================================
 * LOVEVERSE - CORE JAVASCRIPT
 * Module 1: Nút tròn bấm giữ 2 giây (Hold-to-activate Circle Button)
 * Module 2: Điều khiển Đoá hồng trong lồng kính ma thuật (Enchanted Rose)
 * Module 3: Chuyển cảnh sang Màn hình Intro Text (Hạt chữ Canvas 20/10)
 * ============================================================================
 */

/* ============================================================
 * 1. MODULE NÚT TRÒN BẤM GIỮ (HOLD-TO-ACTIVATE CIRCLE BUTTON)
 * ============================================================ */
class HoldCircleButton {
  constructor(options = {}) {
    this.wrap = typeof options.targetId === 'string'
      ? document.getElementById(options.targetId)
      : (options.targetId || document.getElementById('hold-circle-wrap'));

    this.ring = typeof options.ringId === 'string'
      ? document.getElementById(options.ringId)
      : (options.ringId || document.getElementById('hold-ring-fill'));

    this.label = document.getElementById('hold-btn-label');

    this.duration = options.holdDuration || 1000; // 1 giây nhấn giữ
    this.haptic = options.haptic !== false;

    this.onStart = options.onStart || null;
    this.onProgress = options.onProgress || null;
    this.onComplete = options.onComplete || null;
    this.onCancel = options.onCancel || null;

    this.CIRCUMFERENCE = 188.495; // 2 * PI * 30

    this.isHolding = false;
    this.isCompleted = false;
    this.holdStartTime = 0;
    this.currentProgress = 0;
    this.holdRafId = null;
    this.rollbackRafId = null;

    this.init();
  }

  init() {
    if (!this.wrap || !this.ring) return;

    this.setProgress(0);

    this.wrap.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.wrap.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.wrap.addEventListener('pointercancel', this.handlePointerUp.bind(this));

    this.wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!this.isHolding) {
          this.handlePointerDown({ preventDefault: () => { }, stopPropagation: () => { } });
        }
      }
    });

    this.wrap.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handlePointerUp();
      }
    });
  }

  setProgress(p) {
    p = Math.max(0, Math.min(1, p));
    this.currentProgress = p;

    const offset = this.CIRCUMFERENCE * (1 - p);
    this.ring.style.strokeDashoffset = offset.toFixed(2);

    if (typeof this.onProgress === 'function') {
      this.onProgress(p);
    }
  }

  handlePointerDown(e) {
    if (this.isCompleted) return;
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();

    if (e.pointerId) {
      try {
        this.wrap.setPointerCapture(e.pointerId);
      } catch (_) { }
    }

    this.isHolding = true;
    this.holdStartTime = performance.now();
    cancelAnimationFrame(this.rollbackRafId);

    this.wrap.classList.add('holding');
    if (this.label) {
      this.label.textContent = "Đang thắp sáng đoá hồng...";
    }

    if (this.haptic && navigator.vibrate) {
      try { navigator.vibrate(25); } catch (_) { }
    }

    if (typeof this.onStart === 'function') {
      this.onStart();
    }

    this.holdRafId = requestAnimationFrame(this.loop.bind(this));
  }

  loop(now) {
    if (!this.isHolding || this.isCompleted) return;

    const elapsed = now - this.holdStartTime;
    const progress = Math.min(1.0, elapsed / this.duration);

    this.setProgress(progress);

    if (this.haptic && navigator.vibrate) {
      if (Math.floor(elapsed / 200) > Math.floor((elapsed - 16) / 200)) {
        try { navigator.vibrate(12); } catch (_) { }
      }
    }

    if (progress >= 1.0) {
      this.triggerComplete();
    } else {
      this.holdRafId = requestAnimationFrame(this.loop.bind(this));
    }
  }

  handlePointerUp(e) {
    if (e && e.pointerId) {
      try { this.wrap.releasePointerCapture(e.pointerId); } catch (_) { }
    }

    if (this.isCompleted || !this.isHolding) return;

    this.isHolding = false;
    cancelAnimationFrame(this.holdRafId);

    this.wrap.classList.remove('holding');
    if (this.label) {
      this.label.textContent = "Chạm giữ vân tay 2s để thắp sáng";
    }

    const startProgress = this.currentProgress;
    const rollbackDuration = 280;
    const rollbackStart = performance.now();

    const rollbackLoop = (now) => {
      const el = now - rollbackStart;
      const t = Math.min(1.0, el / rollbackDuration);
      const easedT = 1 - Math.pow(1 - t, 2);
      const newProgress = startProgress * (1 - easedT);

      this.setProgress(newProgress);

      if (t < 1.0 && !this.isHolding && !this.isCompleted) {
        this.rollbackRafId = requestAnimationFrame(rollbackLoop);
      } else if (!this.isHolding && !this.isCompleted) {
        this.setProgress(0);
        if (typeof this.onCancel === 'function') {
          this.onCancel();
        }
      }
    };

    this.rollbackRafId = requestAnimationFrame(rollbackLoop);
  }

  triggerComplete() {
    if (this.isCompleted) return;
    this.isCompleted = true;
    this.isHolding = false;
    cancelAnimationFrame(this.holdRafId);

    this.setProgress(1.0);

    if (this.haptic && navigator.vibrate) {
      try { navigator.vibrate([60, 80, 150]); } catch (_) { }
    }

    if (this.label) {
      this.label.textContent = "Đoá hồng đã bừng sáng! ✨";
    }

    this.wrap.classList.remove('holding');
    this.wrap.classList.add('done');

    setTimeout(() => {
      this.wrap.style.display = 'none';
      if (typeof this.onComplete === 'function') {
        this.onComplete();
      }
    }, 450);
  }
}

/* ============================================================
 * 2. ĐIỀU KHIỂN ĐOÁ HỒNG TRONG LỒNG KÍNH (ENCHANTED ROSE)
 * ============================================================ */
class EnchantedRoseController {
  constructor(chamberId = "castle", haloId = "rose-halo", hintId = "rose-click-hint") {
    this.chamber = document.getElementById(chamberId);
    this.halo = document.getElementById(haloId);
    this.hint = document.getElementById(hintId);
    this.progress = 0;
    this.isAwakened = false;

    this.setProgress(0);
    this.bindEvents();
  }

  setProgress(p) {
    p = Math.max(0, Math.min(1, p));
    this.progress = p;

    if (!this.chamber) return;

    // Lúc đầu hiển thị rõ nét, dịu nhẹ: brightness 0.55, saturate 0.75, opacity 0.72
    // Khi giữ nút: bừng sáng dần lên đến brightness 1.25, saturate 1.30, opacity 1.0
    const brightness = 0.55 + p * 0.70;
    const saturate = 0.75 + p * 0.55;
    const opacity = 0.72 + p * 0.28;

    this.chamber.style.setProperty("--rose-progress", p.toFixed(3));
    // Dùng brightness + saturate thuần (tính toán màu trên GPU siêu nhẹ, không dùng drop-shadow liên tục tránh sụt frame)
    this.chamber.style.filter = `brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)})`;
    this.chamber.style.opacity = opacity.toFixed(3);

    // Hiệu ứng hào quang toả sáng được giao cho rose-halo xử lý qua GPU transform và opacity cực kỳ mượt
    if (this.halo) {
      this.halo.style.opacity = (0.12 + p * 0.88).toFixed(3);
      const scale = (0.75 + p * 0.45).toFixed(3);
      this.halo.style.transform = `translate3d(-50%, -50%, 0) scale(${scale})`;
    }
  }

  setAwakened(awakened = true) {
    this.isAwakened = awakened;
    window.isRoseLitAndReady = awakened;

    if (awakened) {
      this.setProgress(1.0);
      if (this.chamber) {
        this.chamber.classList.add("awakened");
      }
      if (this.hint) {
        this.hint.classList.add("show");
      }
    } else {
      if (this.chamber) {
        this.chamber.classList.remove("awakened");
      }
      if (this.hint) {
        this.hint.classList.remove("show");
      }
    }
  }

  bindEvents() {
    if (!this.chamber) return;

    const handleInteraction = (e) => {
      if (e && e.cancelable) e.preventDefault();

      // Khi đã thắp sáng hoàn toàn -> Chạm để chuyển sang màn hình Intro Text
      if (this.isAwakened || window.isRoseLitAndReady) {
        transitionToIntroText();
      } else {
        // Nếu chạm khi chưa thắp sáng -> Gợi ý nhẹ
        if (navigator.vibrate) {
          try { navigator.vibrate(20); } catch (_) {}
        }
        this.chamber.style.transform = "translate3d(-50%, -50%, 0) scale(calc(var(--rose-base-scale, 1) * 0.96))";
        setTimeout(() => {
          this.chamber.style.transform = "";
        }, 180);
      }
    };

    this.chamber.addEventListener("pointerdown", handleInteraction);
  }
}

/* ============================================================
 * 3. HÀM CHUYỂN CẢNH MÀN HÌNH SANG INTRO TEXT & HIỆN BÓ HOA LIỀN MẠCH
 * ============================================================ */
let isTransitioning = false;

function revealBouquetSeamlessly() {
  const introCanvas = document.getElementById("intro-canvas");
  const bouquetWrap = document.getElementById("bouquet-wrap");

  // Mờ dần canvas chữ 3D sau khi hạt đã nổ bung
  if (introCanvas) {
    introCanvas.style.transition = "opacity 0.8s ease";
    introCanvas.style.opacity = "0";
    setTimeout(() => {
      introCanvas.style.display = "none";
    }, 850);
  }

  // Bó hoa và nút mở thư xuất hiện liền mạch trên cùng nền trời hoàng hôn
  if (bouquetWrap) {
    // 1. Tái kích hoạt toàn bộ animation bung nở (thân cành vươn cao, nụ bung nở, từng lớp cánh 3D, hoa đung đưa và hào quang tỏa sáng)
    const flowers = bouquetWrap.querySelector(".flowers");
    if (flowers) {
      const clone = flowers.cloneNode(true);
      flowers.parentNode.replaceChild(clone, flowers);
    }

    // 2. Kích hoạt hiển thị bó hoa mượt mà
    bouquetWrap.style.display = "";
    bouquetWrap.classList.remove("hidden-bouquet");
    void bouquetWrap.offsetWidth; // Ép reflow để trình duyệt khởi tạo animation ngay lập tức
    bouquetWrap.classList.add("show-bouquet");
    bouquetWrap.setAttribute("aria-hidden", "false");

    // 3. Ẩn nút next ban đầu, chỉ hiển thị mượt mà sau khi hiệu ứng hoa bung nở hoàn tất (~3.5s)
    const letterBtnWrapper = bouquetWrap.querySelector(".letter-btn-wrapper");
    if (letterBtnWrapper) {
      letterBtnWrapper.classList.remove("show-btn");
      if (window._bouquetBtnTimer) clearTimeout(window._bouquetBtnTimer);
      window._bouquetBtnTimer = setTimeout(() => {
        letterBtnWrapper.classList.add("show-btn");
      }, 3500);
    }
  }

  // Rung haptic nhẹ nhàng nếu thiết bị hỗ trợ
  if (navigator.vibrate) {
    try { navigator.vibrate([40, 60, 100]); } catch (_) { }
  }
}

function transitionToIntroText() {
  if (isTransitioning) return;
  isTransitioning = true;

  const introScreen = document.getElementById("intro-screen");
  const introTextScreen = document.getElementById("intro-text-screen");
  const roseChamber = document.getElementById("castle");
  const magicBurst = document.getElementById("magic-light-burst");

  // Rung haptic nhẹ nhàng 1 nhịp êm ái
  if (navigator.vibrate) {
    try { navigator.vibrate(30); } catch (_) { }
  }

  // Đảm bảo nhạc nền được phát
  if (typeof window.playBgMusic === 'function') {
    window.playBgMusic();
  }

  // 1. Ẩn nút nhấn giữ và gợi ý chạm ngay tức thì
  if (introScreen) {
    introScreen.classList.add("transitioning");
  }

  // 2. Kích hoạt hiệu ứng hoa bay bổng thăng hoa & luồng sáng dịu nở bừng
  if (roseChamber) {
    roseChamber.classList.remove("awakened");
    roseChamber.classList.add("awakening-burst");
  }

  if (magicBurst) {
    magicBurst.classList.add("active");
  }

  // 3. Kích hoạt Màn Intro Text đồng thời: chạy đồng bộ cross-fade 0.8s
  if (introTextScreen) {
    introTextScreen.style.display = "";
    introTextScreen.classList.remove("hidden");
    introTextScreen.classList.add("fading-in");
    introTextScreen.setAttribute("aria-hidden", "false");
    void introTextScreen.offsetWidth; // Ép reflow 1 lần duy nhất đảm bảo bắt đầu từ opacity 0
    introTextScreen.classList.remove("fading-in");
  }

  // Khởi chạy hệ thống hạt chữ Three.js ngay lập tức (đã pre-warm sẵn, 0ms latency)
  if (typeof window.initIntroText === 'function') {
    window.introTextInstance = window.initIntroText(() => {
      revealBouquetSeamlessly();
    });
  }

  // 4. Màn hoa tan biến đồng thời cùng lúc với màn intro text sáng lên
  if (introScreen) {
    introScreen.classList.add("dissolving");
  }

  // Làm dịu quầng sáng quang học sau 250ms
  setTimeout(() => {
    if (magicBurst) {
      magicBurst.classList.add("fade-out");
    }
  }, 250);

  // 5. Hoàn tất toàn bộ chu kỳ chuyển cảnh 850ms, dọn dẹp sạch sẽ
  setTimeout(() => {
    if (introScreen) {
      introScreen.classList.add("hidden");
      introScreen.classList.remove("dissolving", "transitioning");
    }
    if (roseChamber) {
      roseChamber.classList.remove("awakening-burst");
    }
    if (magicBurst) {
      magicBurst.classList.remove("active", "fade-out");
    }
    isTransitioning = false;
  }, 850);
}

// Lắng nghe sự kiện custom nếu được bắn từ introText
window.addEventListener("textMessagesComplete", () => {
  revealBouquetSeamlessly();
});

/* ============================================================
 * 4. KHỞI TẠO TOÀN CỤC KHI TẢI TRANG
 * ============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  window.isRoseLitAndReady = false;

  // 1. Khởi tạo điều khiển Đoá hồng trong lồng kính
  const rose = new EnchantedRoseController("castle", "rose-halo", "rose-click-hint");
  window.roseController = rose;

  // 2. Khởi tạo Nút tròn bấm giữ 1 giây để thắp sáng đoá hồng
  const holdButton = new HoldCircleButton({
    targetId: 'hold-circle-wrap',
    ringId: 'hold-ring-fill',
    holdDuration: 1000,
    haptic: true,

    onStart: () => {
      // Bắt đầu giữ nút: tia sáng bắn lên
    },

    onProgress: (progress) => {
      // Khi giữ nút: Đoá hồng và lồng kính sáng dần lên tương ứng tiến trình
      rose.setProgress(progress);
    },

    onCancel: () => {
      // Nếu buông tay trước khi hoàn thành: Mờ tối dần trở lại
      rose.setProgress(0);
    },

    // Khi giữ đủ 1 giây: Đoá hồng bừng sáng rực rỡ và sẵn sàng để chạm chuyển màn
    onComplete: () => {
      rose.setAwakened(true);
      // Tự động phát nhạc nền khi nhấn nút button tròn xong
      if (typeof window.playBgMusic === 'function') {
        window.playBgMusic();
      }
    }
  });

  window.holdButton = holdButton;

  // 3. Pre-warm Three.js và hạt chữ 3D trong thời gian rảnh để khi chuyển màn đạt 60fps mượt mà tuyệt đối
  if (typeof window.initIntroText === 'function') {
    setTimeout(() => {
      window.initIntroText(null, { autoStart: false });
    }, 350);
  }
});

/* ============================================================
 * 5. TRUNG TÂM QUẢN LÝ DỮ LIỆU ĐỘNG TỪ SERVER (API INTEGRATION)
 * ============================================================ */

/**
 * Nạp dữ liệu đồng bộ từ server vào cả 3 màn hình:
 * @param {Object} payload
 * @param {string[]} [payload.introMessages] - Danh sách câu chữ 3D intro
 * @param {Object} [payload.letter] - { title, content, signature }
 * @param {Array} [payload.gallery] - Mảng URL ảnh string[] hoặc [{ src, caption }]
 */
function setLoveVerseData(payload) {
  if (!payload || typeof payload !== "object") return;

  window.LOVE_VERSE_DATA = window.LOVE_VERSE_DATA || {};
  Object.assign(window.LOVE_VERSE_DATA, payload);

  // 1. Cập nhật câu chữ Intro Text
  if (Array.isArray(payload.introMessages) && typeof window.setIntroMessages === "function") {
    window.setIntroMessages(payload.introMessages);
  }

  // 2. Cập nhật nội dung thư 3D
  const letterPayload = payload.letter || (payload.letterBody !== undefined || payload.letterContent !== undefined || payload.letterTitle !== undefined || payload.letterSignature !== undefined
    ? {
        title: payload.letterTitle !== undefined ? payload.letterTitle : "",
        content: payload.letterBody || payload.letterContent || "",
        signature: payload.letterSignature !== undefined ? payload.letterSignature : ""
      }
    : null);

  if (letterPayload && typeof window.setLetterData === "function") {
    window.setLetterData(letterPayload);
  }

  // 3. Cập nhật bộ sưu tập ảnh Gallery
  if (Array.isArray(payload.gallery) && typeof window.setGalleryImages === "function") {
    window.setGalleryImages(payload.gallery);
  }

  // 4. Cập nhật dữ liệu màn Love Rain (mưa tim 3D & lời chúc)
  const rainData = Object.assign({}, payload.loveRain || payload.loveGift || {});
  const wishesList = payload.messages || payload.wishes || rainData.messages || rainData.wishes;
  if (Array.isArray(wishesList) && wishesList.length > 0) {
    rainData.messages = wishesList.filter((m) => typeof m === "string" && m.trim().length > 0);
  }
  if (Array.isArray(payload.gallery) && payload.gallery.length > 0) {
    rainData.images = payload.gallery;
  }
  if (typeof window.setLoveGiftData === "function") {
    window.setLoveGiftData(rainData);
  }

  // 5. Cập nhật bài hát nhạc nền động nếu có
  if ((payload.music || payload.musicUrl || payload.bgMusic) && typeof window.setBgMusicTrack === "function") {
    window.setBgMusicTrack(payload.music || payload.musicUrl || payload.bgMusic);
  }

  // 6. Cập nhật trạng thái hiển thị Nút Next ở cuối màn ảnh Gallery
  const isRainDisabled = (payload.loveRain && payload.loveRain.enabled === false) || payload.universeEnabled === false;
  if (isRainDisabled) {
    document.documentElement.classList.add("is-no-universe");
  } else if ((payload.loveRain && payload.loveRain.enabled === true) || payload.universeEnabled === true) {
    document.documentElement.classList.remove("is-no-universe");
  }

  if (typeof window.updateGalleryNextButton === "function") {
    window.updateGalleryNextButton();
  }
  window.dispatchEvent(new CustomEvent("loveverse:data-updated", { detail: payload }));
}

/**
 * Tiện ích gọi API Server tự động qua fetch:
 * Sử dụng: window.fetchLoveVerseData('/api/loveverse-data')
 */
async function fetchLoveVerseData(apiUrl, fetchOptions = {}) {
  try {
    const res = await fetch(apiUrl, fetchOptions);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    setLoveVerseData(data);
    return data;
  } catch (err) {
    console.warn("[LoveVerse API] Không thể tải dữ liệu server, giữ nguyên dữ liệu mặc định:", err);
    return null;
  }
}

window.setLoveVerseData = setLoveVerseData;
window.fetchLoveVerseData = fetchLoveVerseData;

// Tự động kích hoạt nếu Backend nhúng biến cấu hình SSR sẵn trước đó
if (typeof window !== 'undefined' && window.LOVE_VERSE_CONFIG) {
  setLoveVerseData(window.LOVE_VERSE_CONFIG);
}
