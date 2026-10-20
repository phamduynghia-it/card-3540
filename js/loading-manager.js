/**
 * Quản lý Màn chờ Tải Dữ liệu (Loading Overlay Manager)
 * Triển khai theo tài liệu LOADING_SCREEN_GUIDE.md
 */
const LoadingScreen = {
  getElements() {
    return {
      overlay: document.getElementById('loading-overlay'),
      bar: document.getElementById('loading-bar'),
      pct: document.getElementById('loading-pct'),
      title: document.getElementById('loading-title'),
      sub: document.getElementById('loading-sub')
    };
  },

  /**
   * Hiển thị màn chờ
   * @param {string} [title] - Tiêu đề (mặc định: "Đang tải dữ liệu")
   * @param {string} [sub] - Phụ đề (mặc định: "Đang tải ảnh và dữ liệu...")
   */
  show(title = 'Đang tải dữ liệu', sub = 'Đang tải ảnh và dữ liệu...') {
    const el = this.getElements();
    if (!el.overlay) return;

    if (title && el.title) el.title.textContent = title;
    if (sub && el.sub) el.sub.textContent = sub;

    el.overlay.classList.remove('is-fading-out');
    el.overlay.removeAttribute('hidden');
    el.overlay.hidden = false;
    el.overlay.setAttribute('aria-busy', 'true');
    el.overlay.setAttribute('aria-hidden', 'false');
    this.setProgress(0);
  },

  /**
   * Cập nhật tiến độ % (0 -> 100)
   * @param {number} percent
   */
  setProgress(percent) {
    const el = this.getElements();
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    if (el.bar) el.bar.style.width = clamped + '%';
    if (el.pct) el.pct.textContent = clamped + '%';
  },

  /**
   * Cập nhật thông điệp phụ đề
   * @param {string} text
   */
  setMessage(text) {
    const el = this.getElements();
    if (el.sub) el.sub.textContent = text;
  },

  /**
   * Ẩn màn chờ ngay lập tức
   */
  hide() {
    const el = this.getElements();
    if (!el.overlay) return;
    el.overlay.setAttribute('hidden', '');
    el.overlay.hidden = true;
    el.overlay.setAttribute('aria-busy', 'false');
    el.overlay.setAttribute('aria-hidden', 'true');
    el.overlay.classList.remove('is-fading-out');
  },

  /**
   * Ẩn màn chờ có hiệu ứng fade out mượt
   */
  hideWithFade(duration = 400) {
    return new Promise((resolve) => {
      const el = this.getElements();
      if (!el.overlay) return resolve();
      el.overlay.classList.add('is-fading-out');
      setTimeout(() => {
        this.hide();
        resolve();
      }, duration);
    });
  },

  /**
   * Chờ một số lượng khung hình animation (giúp UI render mượt và Three.js compile shader xong)
   * @param {number} count
   */
  waitFrames(count = 1) {
    return new Promise((resolve) => {
      function step(left) {
        if (left <= 0) return resolve();
        requestAnimationFrame(() => step(left - 1));
      }
      step(count);
    });
  },

  /**
   * Helper tải trước 1 ảnh (Preload Image)
   * @param {string} src
   * @returns {Promise<boolean>}
   */
  preloadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(false);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(true);
      img.onerror = () => {
        console.warn('⚠️ [LoadingScreen] Không thể nạp trước ảnh:', src);
        resolve(false);
      };
      img.src = src;
    });
  },

  /**
   * Helper nạp trước 1 file script
   * @param {string} src
   * @returns {Promise<void>}
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();

      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
};

let troikaPreloadPromise = null;

/**
 * Tải trước và sinh sẵn SDF Texture Atlas cho font 3D Mali.ttf (Troika Text)
 * Giúp câu chúc 3D hiển thị tức thì cùng lúc với hình ảnh, không bị trễ 2 giây
 */
function ensureTroikaFontPreloaded() {
  if (troikaPreloadPromise) return troikaPreloadPromise;

  troikaPreloadPromise = (async () => {
    try {
      const activeFont = (window.__SERVER_DATA__ && window.__SERVER_DATA__.fontName) || 'Mali';
      const fontUrl = new URL(`assets/font/${activeFont}.ttf`, window.location.origin).href;

      // 1. Tải raw binary của font vào Browser HTTP Cache
      await fetch(fontUrl, { mode: 'cors' }).catch(() => {});

      // 2. Tải engine Troika Text và sinh trước SDF Glyph Atlas
      const { p: preloadFont } = await import('./troika-three-text.esm.js');
      if (typeof preloadFont === 'function') {
        const defaultMsgs = [
          "Thế giới của anh có em 💕",
          "Anh yêu em nhiều lắm! ✨",
          "Đồng ý làm người yêu anh nhé 💖",
          "Em là cả thế giới của anh 🌸",
          "Mỗi ngày bên em đều là một ngày hạnh phúc 🌹",
          "Yêu em hơn mỗi ngày 💕"
        ];
        const serverMsgs = (window.__SERVER_DATA__ && Array.isArray(window.__SERVER_DATA__.messages) && window.__SERVER_DATA__.messages.length > 0)
          ? window.__SERVER_DATA__.messages
          : defaultMsgs;

        const allChars = Array.from(new Set(
          (serverMsgs.join('') + ' aáàảãạăắằẳẵặâấầẩẫậbcdđeéèẻẽẹêếềểễệghiíìỉĩịklmnoóòỏõọôốồổỗộơớờởỡợpqrstuúùủũụưứừửữựvxyýỳỷỹỵAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬBCDĐEÉÈẺẼẸÊẾỀỂỄỆGHIÍÌỈĨỊKLMNOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢPQRSTUÚÙỦŨỤƯỨỪỬỮỰVXYÝỲỶỸỴ0123456789!?,.:;-"\'()…✨💕💖🌸🌹⭐❤️').split('')
        )).join('');

        await new Promise((resolve) => {
          preloadFont({
            font: fontUrl,
            characters: allChars,
            sdfGlyphSize: 64
          }, () => {
            console.log('✅ [LoadingScreen] Font 3D Mali.ttf & SDF Atlas đã hoàn tất sẵn sàng!');
            resolve();
          });
          // Timeout dự phòng
          setTimeout(resolve, 2000);
        });
      }
    } catch (e) {
      console.warn('⚠️ [LoadingScreen] Không thể nạp trước Troika font:', e);
    }
  })();

  return troikaPreloadPromise;
}

// Kích hoạt nạp ngầm từ sớm ngay khi trang tải xong
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(ensureTroikaFontPreloaded, 100);
    });
  } else {
    setTimeout(ensureTroikaFontPreloaded, 100);
  }
}

/**
 * Quy trình chuyển cảnh sang Love Rain kèm màn loading chuẩn bị dữ liệu
 */
async function transitionToLoveRainWithLoading() {
  console.log('🚀 [LoadingScreen] Bắt đầu chuyển cảnh sang màn Love Rain...');

  // 1. Mở màn chờ với giao diện hồng neon
  LoadingScreen.show('Đang chuẩn bị Love Rain 💕', 'Đang kết nối không gian yêu thương...');
  LoadingScreen.setProgress(12);

  // Ẩn màn bộ sưu tập ảnh trước để giải phóng DOM
  if (typeof window.hideImageBirthday === 'function') {
    window.hideImageBirthday();
  }

  // Dừng nhẹ 220ms để mắt kịp nhìn thấy thanh bắt đầu chạy
  await new Promise((r) => setTimeout(r, 220));

  try {
    // 2. Kiểm tra nếu có API đang fetch từ server thì chờ
    if (window.__serverFetchPromise) {
      LoadingScreen.setMessage('Đang nhận dữ liệu câu chúc từ server...');
      LoadingScreen.setProgress(22);
      try {
        await Promise.race([
          window.__serverFetchPromise,
          new Promise((r) => setTimeout(r, 1500))
        ]);
      } catch (e) {}
    }
    LoadingScreen.setProgress(28);

    // Đồng bộ toàn bộ ảnh từ màn hình ảnh (Gallery) sang màn Love Rain
    if (typeof window.syncGalleryImagesToLoveRain === "function") {
      try { window.syncGalleryImagesToLoveRain(); } catch (_) {}
    }

    // 3. Gom danh sách toàn bộ ảnh cần nạp trước cho màn Love Rain
    const serverImages = (window.__SERVER_DATA__ && Array.isArray(window.__SERVER_DATA__.images))
      ? window.__SERVER_DATA__.images
      : [];
    const clientImages = Array.isArray(window.LOVEGIFT_IMAGES) && window.LOVEGIFT_IMAGES.length > 0
      ? window.LOVEGIFT_IMAGES
      : (window.LOVE_VERSE_DATA && Array.isArray(window.LOVE_VERSE_DATA.gallery) ? window.LOVE_VERSE_DATA.gallery : []);

    const allImagesToPreload = Array.from(new Set([
      ...serverImages,
      ...clientImages
    ])).filter((src) => typeof src === "string" && src.length > 0 && !src.includes("loveResver"));

    // Tải trước danh sách ảnh song song nhanh chóng
    if (allImagesToPreload.length > 0) {
      LoadingScreen.setMessage("Đang chuẩn bị ảnh kỷ niệm...");
      await Promise.allSettled(
        allImagesToPreload.map((src) =>
          Promise.race([
            LoadingScreen.preloadImage(src),
            new Promise((r) => setTimeout(r, 350))
          ])
        )
      );
    }
    LoadingScreen.setProgress(78);

    // 4. Nạp font chữ 3D (Mali.ttf) và sinh trước SDF Glyph Atlas
    LoadingScreen.setMessage('Đang chuẩn bị câu chúc 3D & hiệu ứng ánh sáng...');
    LoadingScreen.setProgress(85);

    // Nạp cả CSS font và 3D Troika font song song
    await Promise.allSettled([
      ensureTroikaFontPreloaded(),
      document.fonts && document.fonts.load ? document.fonts.load('1.2rem Mali') : Promise.resolve()
    ]);
    LoadingScreen.setProgress(92);

    // 5. Khởi động màn hình Love Rain trong nền phía sau màn loading
    LoadingScreen.setMessage('Khởi tạo bầu trời sao & mưa tim 3D...');
    LoadingScreen.setProgress(95);

    const rainScreen = document.getElementById('love-rain-screen');
    if (rainScreen) {
      rainScreen.style.display = 'block';
      rainScreen.classList.add('is-active');
      rainScreen.setAttribute('aria-hidden', 'false');
      window.dispatchEvent(new Event('resize'));
    }

    // Dọn dẹp các màn trước
    const introTextScreen = document.getElementById('intro-text-screen');
    if (introTextScreen) {
      introTextScreen.classList.add('hidden');
      introTextScreen.style.display = 'none';
    }
    const bouquetWrap = document.getElementById('bouquet-wrap');
    if (bouquetWrap) {
      bouquetWrap.classList.add('hidden-bouquet');
      bouquetWrap.style.display = 'none';
      const btn = bouquetWrap.querySelector('.letter-btn-wrapper');
      if (btn) btn.classList.remove('show-btn');
    }

    // Chờ 12 frame để Three.js compile shaders và kết xuất xong cả chữ 3D lẫn hình ảnh
    await LoadingScreen.waitFrames(12);

    // 6. Hoàn tất 100%
    LoadingScreen.setMessage('Sẵn sàng bước vào Love Rain! 💕');
    LoadingScreen.setProgress(100);

    // Dừng 280ms để người dùng nhìn thấy 100% trọn vẹn
    await new Promise((r) => setTimeout(r, 280));

    // 7. Fade out màn loading, để lộ không gian 3D Love Rain lung linh cả câu chúc lẫn ảnh đồng thời
    await LoadingScreen.hideWithFade(450);
    console.log('✅ [LoadingScreen] Đã vào màn Love Rain: câu chúc & ảnh cùng xuất hiện rực rỡ!');
  } catch (err) {
    console.error('⚠️ [LoadingScreen] Lỗi trong quá trình chuẩn bị Love Rain:', err);
    // Vẫn hiển thị Love Rain để không bị kẹt
    const rainScreen = document.getElementById('love-rain-screen');
    if (rainScreen) {
      rainScreen.style.display = 'block';
      rainScreen.classList.add('is-active');
    }
    LoadingScreen.hide();
  }
}

// Xuất các hàm ra phạm vi window để toàn bộ dự án gọi được
window.LoadingScreen = LoadingScreen;
window.transitionToLoveRainWithLoading = transitionToLoveRainWithLoading;
window.ensureTroikaFontPreloaded = ensureTroikaFontPreloaded;
