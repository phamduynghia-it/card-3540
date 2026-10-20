/**
 * Image Birthday Gallery Controller
 * Tự động render 2 kiểu khung ảnh, quản lý hiệu ứng Reveal & Lightbox tương tác
 */

document.addEventListener("DOMContentLoaded", () => {
  const screenEl = document.getElementById("image-birthday");
  const galleryEl = document.getElementById("main-gallery");
  const lightbox = document.getElementById("custom-lightbox");
  const lbContentTarget = document.getElementById("lb-content-target");
  const lbClose = document.getElementById("lb-close");
  const lbPrev = document.getElementById("lb-prev");
  const lbNext = document.getElementById("lb-next");
  const lbCounter = document.getElementById("lb-counter");

  let galleryData = [];
  let lightboxSlides = [];
  let currentIndex = 0;
  let hasStarted = false;

  // 1. TIỆN ÍCH AN TOÀN HTML
  function escapeHtml(val) {
    return String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Ảnh dự phòng khi người dùng chưa đặt ảnh vào assets/images
  const FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
  ];

  const DEFAULT_CAPTION = "For You";

  // 2. DỮ LIỆU BỘ ẢNH & CHUẨN HÓA DỮ LIỆU TỪ SERVER
  const MOCK_ITEMS = [
    { src: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80", caption: "For You" },
    { src: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&auto=format&fit=crop&q=80", caption: "Sweet Heart" },
    { src: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop&q=80", caption: "Forever" },
  ];

  // Hàm chuẩn hóa linh hoạt dữ liệu ảnh nhận từ server (hỗ trợ cả mảng url string[] lẫn object[])
  function normalizeGalleryItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map((raw, idx) => {
      if (typeof raw === "string") {
        return {
          src: raw,
          caption: DEFAULT_CAPTION,
          fallback: FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]
        };
      }
      if (raw && typeof raw === "object") {
        return {
          src: raw.src || raw.url || raw.image || "",
          caption: raw.caption || raw.title || DEFAULT_CAPTION,
          fallback: raw.fallback || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]
        };
      }
      return { src: "", caption: DEFAULT_CAPTION, fallback: FALLBACK_IMAGES[0] };
    }).filter(item => item.src.length > 0);
  }

  const serverGallery = window.LOVE_VERSE_DATA?.gallery || window.LOVE_VERSE_CONFIG?.gallery;
  galleryData = (Array.isArray(serverGallery) && serverGallery.length)
    ? normalizeGalleryItems(serverGallery)
    : MOCK_ITEMS;

  // 3. HÀM RENDER KHUNG HOA HỒNG NGHỆ THUẬT (khungMoi.png)
  function renderRoseFrame(rawItem, index, slideIndex) {
    const item = typeof rawItem === "string" ? { src: rawItem } : rawItem;
    const src = escapeHtml(item.src);
    const fallback = escapeHtml(item.fallback || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]);
    const caption = escapeHtml(item.caption || DEFAULT_CAPTION);
    const isPriority = index < 2;
    const priorityAttr = isPriority ? 'fetchpriority="high" loading="eager"' : 'decoding="async"';
    return `
      <article
        class="gallery-item rose-frame-style"
        data-index="${index}"
        data-slide-index="${slideIndex}"
        role="button"
        tabindex="0"
        aria-label="${caption}"
      >
        <div class="frame-aspect-box">
          <!-- Ảnh chụp nằm lọt bên trong khung -->
          <div class="frame-photo-container">
            <img src="${src}" alt="${caption}" onerror="this.onerror=null; this.src='${fallback}';" ${priorityAttr} />
            <div class="frame-photo-glow"></div>
          </div>

          <!-- Lớp khung ảnh hoa tulip & hoa đào viền uốn lượn PNG (khungMoi.png) -->
          <img src="images/khungMoi.png" alt="Khung ảnh hoa tulip" class="frame-overlay-img" draggable="false" />

          <!-- Dòng chữ viết tay mặc định For You trên bảng thiệp phía dưới -->
          <div class="frame-caption-container">
            <span class="frame-caption-text">${caption}</span>
          </div>
        </div>
      </article>
    `;
  }

  // 4. RENDER TOÀN BỘ GALLERY
  function renderGallery(items) {
    if (!items.length) {
      galleryEl.innerHTML = '<div class="gallery-status">Chưa có ảnh nào.</div>';
      return;
    }

    lightboxSlides = [];
    let slideCursor = 0;

    galleryEl.innerHTML = items
      .map((rawItem, index) => {
        const item = typeof rawItem === "string" ? { src: rawItem } : rawItem;
        const slideIndex = slideCursor++;
        const fallback = item.fallback || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
        lightboxSlides.push({ src: item.src, fallback });
        return renderRoseFrame(item, index, slideIndex);
      })
      .join("");
  }

  // 6. HIỆU ỨNG CUỘN XUẤT HIỆN (INTERSECTION OBSERVER)
  function setupRevealEffects() {
    const items = galleryEl.querySelectorAll(".gallery-item");

    items.forEach((item, idx) => {
      item.style.setProperty("--delay", `${idx * 120}ms`);
    });

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = parseInt(el.style.getPropertyValue("--delay") || "0", 10);
          setTimeout(() => el.classList.add("revealed"), delay);
          obs.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" }
    );

    items.forEach((item) => observer.observe(item));
  }

  // 7. LIGHTBOX CONTROLLER
  function openLightbox(slideIndex) {
    if (!lightboxSlides.length) return;
    currentIndex = slideIndex;
    updateLightbox();
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => {
      lbContentTarget.innerHTML = "";
    }, 400);
  }

  function updateLightbox() {
    const slide = lightboxSlides[currentIndex];
    if (!slide) return;
    lbCounter.textContent = `${currentIndex + 1} / ${lightboxSlides.length}`;
    const fb = slide.fallback ? `onerror="this.onerror=null; this.src='${escapeHtml(slide.fallback)}';"` : "";
    lbContentTarget.innerHTML = `
      <div class="lightbox-image-only">
        <img src="${escapeHtml(slide.src)}" alt="Ảnh xem trước" ${fb} />
      </div>
    `;
  }

  function nextImage() {
    if (!lightboxSlides.length) return;
    currentIndex = (currentIndex + 1) % lightboxSlides.length;
    updateLightbox();
  }

  function prevImage() {
    if (!lightboxSlides.length) return;
    currentIndex = (currentIndex - 1 + lightboxSlides.length) % lightboxSlides.length;
    updateLightbox();
  }

  function bindEvents() {
    // Click mở ảnh phóng to
    galleryEl.querySelectorAll(".gallery-item").forEach((el) => {
      el.addEventListener("click", () => openLightbox(Number(el.dataset.slideIndex)));
    });

    // Điều khiển Lightbox
    lbClose?.addEventListener("click", closeLightbox);
    lbNext?.addEventListener("click", nextImage);
    lbPrev?.addEventListener("click", prevImage);

    lightbox?.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target === lbContentTarget) closeLightbox();
    });

    // Phím tắt bàn phím
    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("active")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    });

    // Vuốt tay cảm ứng trên điện thoại (Touch Swipe)
    let touchStartX = 0;
    lightbox?.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox?.addEventListener("touchend", (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) nextImage();
      else if (touchEndX - touchStartX > 50) prevImage();
    }, { passive: true });

    // Điều khiển Nút Next chuyển tiếp ở cuối màn hiển thị ảnh
    const nextBtn = document.getElementById("btn-gallery-next");
    if (nextBtn && !nextBtn.dataset.bound) {
      nextBtn.dataset.bound = "true";

      // Cập nhật nhãn tuỳ biến nếu server/config truyền vào
      const customLabel = window.LOVE_VERSE_DATA?.galleryNextText || window.LOVE_VERSE_CONFIG?.galleryNextText;
      if (customLabel) {
        const labelEl = document.getElementById("gallery-next-label");
        if (labelEl) labelEl.textContent = customLabel;
      }

      nextBtn.addEventListener("click", () => {
        if (nextBtn.disabled) return;
        nextBtn.disabled = true;
        nextBtn.classList.add("is-clicked");

        const targetUrl = window.LOVE_VERSE_CONFIG?.nextUrl || window.LOVE_VERSE_DATA?.nextUrl || "loveRain.html";

        // Bắn sự kiện tuỳ biến cho module khác hoặc analytics lắng nghe
        const nextEvt = new CustomEvent("loveVerseGalleryNext", {
          bubbles: true,
          cancelable: true,
          detail: { targetUrl }
        });
        const notPrevented = window.dispatchEvent(nextEvt);

        if (!notPrevented) {
          nextBtn.disabled = false;
          nextBtn.classList.remove("is-clicked");
          return;
        }

        if (typeof window.onGalleryNext === "function") {
          const result = window.onGalleryNext();
          if (result === false) {
            nextBtn.disabled = false;
            nextBtn.classList.remove("is-clicked");
            return;
          }
        }

        // Tự động đồng bộ toàn bộ ảnh của màn ảnh sang màn cuối Love Rain
        syncGalleryImagesToLoveRain();

        // Chuyển cảnh sang màn Love Rain với màn chờ tải dữ liệu loading screen
        if (typeof window.transitionToLoveRainWithLoading === "function") {
          window.transitionToLoveRainWithLoading().finally(() => {
            nextBtn.disabled = false;
            nextBtn.classList.remove("is-clicked");
          });
        } else if (typeof window.showLoveRain === "function") {
          window.showLoveRain();
          hideImageBirthday();
          nextBtn.disabled = false;
          nextBtn.classList.remove("is-clicked");
        } else {
          const targetUrl = window.LOVE_VERSE_CONFIG?.nextUrl || window.LOVE_VERSE_DATA?.nextUrl || "loveRain.html";
          window.location.href = targetUrl;
        }
      });
    }

    // Kiểm tra xem món quà cuối (Cơn mưa lời chúc) có được chọn/bật hay không
    function isLoveRainEnabled() {
      // 1. Kiểm tra class cờ tắt trên document/html
      if (typeof document !== "undefined") {
        if (document.documentElement?.classList.contains("is-no-universe") ||
            document.body?.classList.contains("is-no-universe")) {
          return false;
        }
      }

      // 2. Kiểm tra các nguồn dữ liệu chính trong LoveVerse
      const dataSources = [
        window.LOVE_VERSE_DATA,
        window.LOVE_VERSE_CONFIG,
        window.LOVE_VERSE_PREVIEW_DATA,
        window.LoveMatrixPreview,
        window.__SERVER_DATA__
      ];

      for (const data of dataSources) {
        if (!data) continue;
        if (data.loveRain && typeof data.loveRain === "object") {
          if (typeof data.loveRain.enabled === "boolean") {
            return data.loveRain.enabled;
          }
        }
        if (typeof data.universeEnabled === "boolean") {
          return data.universeEnabled;
        }
        if (typeof data.loveRainEnabled === "boolean") {
          return data.loveRainEnabled;
        }
      }

      // 3. Kiểm tra từ đối tượng quà tặng BE nạp vào nếu có
      if (window.LOVE_VERSE_GIFT) {
        const g = window.LOVE_VERSE_GIFT;
        const s = g.settings || g;
        if (s.loveRain && typeof s.loveRain.enabled === "boolean") {
          return s.loveRain.enabled;
        }
        if (typeof s.universeEnabled === "boolean") {
          return s.universeEnabled;
        }
      }

      return true;
    }

    // Cập nhật trạng thái hiển thị Nút Next dựa trên việc có chọn Cơn mưa lời chúc hay không
    function updateNextButtonVisibility() {
      const actionWrap = document.getElementById("gallery-action-wrap");
      if (!actionWrap) return;

      const enabled = isLoveRainEnabled();
      if (!enabled) {
        actionWrap.classList.remove("is-visible");
        actionWrap.style.display = "none";
        actionWrap.setAttribute("aria-hidden", "true");
        if (screenEl) screenEl.classList.add("is-no-next");
      } else {
        actionWrap.style.display = "";
        actionWrap.removeAttribute("aria-hidden");
        if (screenEl) screenEl.classList.remove("is-no-next");
        if (typeof handleGalleryScroll === "function") {
          handleGalleryScroll();
        }
      }
    }

    // Lắng nghe sự kiện cuộn của #image-birthday: chỉ khi kéo hết xuống cuối VÀ ảnh cuối cùng đã hiển thị trọn vẹn mới hiển thị Button, kéo lên lại ẩn đi
    function handleGalleryScroll() {
      const actionWrap = document.getElementById("gallery-action-wrap");
      if (!screenEl || !actionWrap) return;

      // Nếu người dùng không chọn món quà cuối Cơn mưa lời chúc -> ẩn hoàn toàn nút Next chuyển màn
      if (!isLoveRainEnabled()) {
        actionWrap.classList.remove("is-visible");
        actionWrap.style.display = "none";
        actionWrap.setAttribute("aria-hidden", "true");
        if (screenEl) screenEl.classList.add("is-no-next");
        return;
      }

      actionWrap.style.display = "";
      actionWrap.removeAttribute("aria-hidden");
      if (screenEl) screenEl.classList.remove("is-no-next");

      const items = galleryEl ? galleryEl.querySelectorAll(".gallery-item") : [];
      const lastItem = items.length ? items[items.length - 1] : null;
      const scrollBottom = screenEl.scrollHeight - (screenEl.scrollTop + screenEl.clientHeight);

      let isFullyScrolled = false;

      if (lastItem) {
        const lastRect = lastItem.getBoundingClientRect();
        const screenRect = screenEl.getBoundingClientRect();
        // Ảnh cuối cùng phải xuất hiện hoàn toàn trong tầm nhìn (đáy ảnh cuối cùng <= đáy màn hình)
        const isLastItemFullyVisible = lastRect.bottom <= (screenRect.bottom + 5);
        // Đồng thời thanh cuộn đã kéo tới sát đáy
        const isAtBottom = scrollBottom <= 25 || (screenEl.scrollHeight <= screenEl.clientHeight + 10);

        isFullyScrolled = isLastItemFullyVisible && isAtBottom;
      } else {
        isFullyScrolled = scrollBottom <= 25 || (screenEl.scrollHeight <= screenEl.clientHeight + 10);
      }

      if (isFullyScrolled) {
        actionWrap.classList.add("is-visible");
      } else {
        actionWrap.classList.remove("is-visible");
      }
    }

    if (screenEl && !screenEl.dataset.scrollBound) {
      screenEl.dataset.scrollBound = "true";
      screenEl.addEventListener("scroll", handleGalleryScroll, { passive: true });
      window.addEventListener("resize", handleGalleryScroll, { passive: true });
    }

    window.__handleGalleryScroll = handleGalleryScroll;
    window.__updateNextButtonVisibility = updateNextButtonVisibility;
    updateNextButtonVisibility();
  }

  // Lấy toàn bộ URL ảnh đang dùng ở màn hình ảnh (Gallery)
  function getGalleryImageUrls() {
    if (!Array.isArray(galleryData) || !galleryData.length) return [];
    return galleryData
      .map((item) => (typeof item === "string" ? item : item?.src))
      .filter(Boolean);
  }

  // Tự động đồng bộ danh sách ảnh từ màn ảnh sang màn cuối Love Rain
  function syncGalleryImagesToLoveRain() {
    const urls = getGalleryImageUrls();
    if (urls && urls.length > 0) {
      window.LOVEGIFT_IMAGES = [...urls];
      if (typeof window.setLoveGiftData === "function") {
        window.setLoveGiftData({ images: urls });
      } else {
        window.__SERVER_DATA__ = window.__SERVER_DATA__ || {};
        window.__SERVER_DATA__.images = [...urls];
      }
    }
  }

  // Hàm toàn cục cho Server/API nạp danh sách ảnh bất kỳ lúc nào
  function setGalleryImages(items) {
    const normalized = normalizeGalleryItems(items);
    if (!normalized.length) return;
    galleryData = normalized;
    window.LOVE_VERSE_DATA = window.LOVE_VERSE_DATA || {};
    window.LOVE_VERSE_DATA.gallery = galleryData;

    // Tự động đồng bộ ảnh sang màn cuối Love Rain
    syncGalleryImagesToLoveRain();

    // Nếu gallery đã khởi tạo hoặc đang mở -> cập nhật giao diện ngay lập tức
    if (hasStarted || screenEl?.classList.contains("is-active")) {
      renderGallery(galleryData);
      setupRevealEffects();
    }

    if (typeof updateNextButtonVisibility === "function") {
      updateNextButtonVisibility();
    }
  }

  // Tải trước tài nguyên ảnh và khung để khi bấm vào là có sẵn ngay lập tức
  function preloadGalleryAssets() {
    const assets = [
      "images/khungMoi.png",
      "images/dayChu.png",
      ...(galleryData || []).map((i) => (typeof i === "string" ? i : i?.src)).filter(Boolean)
    ];
    assets.forEach((url) => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }

  // 8. KHỞI TẠO
  function initGallery(data) {
    const itemsToUse = (Array.isArray(data) && data.length)
      ? normalizeGalleryItems(data)
      : (galleryData.length ? galleryData : MOCK_ITEMS);

    galleryData = itemsToUse;
    renderGallery(galleryData);
    setupRevealEffects();
    bindEvents();
    syncGalleryImagesToLoveRain();
  }

  // Hàm hiển thị màn hình (nếu ban đầu đang ẩn)
  function showImageBirthday(data) {
    if (!screenEl) return;
    screenEl.scrollTop = 0;
    screenEl.classList.add("is-active");
    screenEl.setAttribute("aria-hidden", "false");

    if (data) {
      setGalleryImages(data);
    }

    if (!hasStarted) {
      hasStarted = true;
      initGallery(data || galleryData);
    } else {
      syncGalleryImagesToLoveRain();
    }

    // Kích hoạt xuất hiện mềm mại, có thứ tự cho 2 ảnh đầu tiên ngay khi vào màn hình
    const items = galleryEl ? galleryEl.querySelectorAll(".gallery-item") : [];
    if (items.length > 0) {
      setTimeout(() => items[0]?.classList.add("revealed"), 50);
      if (items.length > 1) {
        setTimeout(() => items[1]?.classList.add("revealed"), 160);
      }
    }

    // Kiểm tra và cập nhật trạng thái hiển thị của Nút Next
    updateNextButtonVisibility();

    // Kiểm tra vị trí cuộn ban đầu để ẩn nút nếu chưa cuộn xuống đáy
    window.setTimeout(() => {
      if (typeof window.__handleGalleryScroll === "function") {
        window.__handleGalleryScroll();
      }
    }, 120);
  }

  function hideImageBirthday() {
    if (!screenEl) return;
    screenEl.classList.remove("is-active");
    screenEl.setAttribute("aria-hidden", "true");
  }

  // Khởi tạo trước DOM và nạp ảnh ngầm ngay từ đầu để sẵn sàng tức thì
  initGallery(galleryData);
  hasStarted = true;
  preloadGalleryAssets();

  window.showImageBirthday = showImageBirthday;
  window.hideImageBirthday = hideImageBirthday;
  window.setGalleryImages = setGalleryImages;
  window.setGalleryData = setGalleryImages;
  window.getGalleryImageUrls = getGalleryImageUrls;
  window.syncGalleryImagesToLoveRain = syncGalleryImagesToLoveRain;
  window.updateGalleryNextButton = updateNextButtonVisibility;
  window.isLoveRainEnabled = isLoveRainEnabled;

  window.addEventListener("loveverse:data-updated", () => {
    updateNextButtonVisibility();
  });
  window.addEventListener("lovegift:update", () => {
    updateNextButtonVisibility();
  });
});
