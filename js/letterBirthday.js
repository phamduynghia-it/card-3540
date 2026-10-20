/**
 * Letter Birthday Animation Controller
 * Quản lý chuỗi animation mở phong bì & hiệu ứng gõ chữ Typewriter
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Quản lý DOM Elements
  const elements = {
    screen: document.querySelector("#letter-birthday"),
    wrapper: document.querySelector(".cssletter"),
    envelope: document.querySelector(".envelope"),
    openButton: document.querySelector("#openEnvelope"),
    title: document.querySelector("#letterTitle"),
    content: document.querySelector("#letterContent"),
    signature: document.querySelector("#letterSignature"),
    continueButton: document.querySelector("#continueLetter"),
    triggerBtn: document.querySelector("#btn-letter"),
  };

  // 2. Cấu hình tốc độ gõ máy chữ (ms trên từng ký tự)
  const TYPE_SPEED = {
    title: 45,          // Tốc độ gõ tiêu đề
    content: 25,        // Tốc độ gõ phần nội dung (mượt mà, không quá lâu)
    signature: 40,      // Tốc độ gõ chữ ký
    pauseBetween: 300,  // Thời gian dừng giữa các phần
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let openBound = false;
  let isEnvelopeOpened = false;

  // Tiện ích: Trợ lý delay bằng Promise
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  // Lấy dữ liệu thư từ các nguồn cấu hình (Server API, URL Preview, SessionStorage, v.v.)
  function getCustomLetterConfig() {
    const sources = [
      window.LOVE_VERSE_DATA,
      window.LOVE_VERSE_CONFIG,
      window.LOVE_VERSE_PREVIEW_DATA,
      window.LoveMatrixPreview
    ];
    for (const src of sources) {
      if (!src) continue;
      if (src.letter && typeof src.letter === "object") {
        return src.letter;
      }
      if (src.letterBody !== undefined || src.letterContent !== undefined || src.letterTitle !== undefined || src.letterSignature !== undefined) {
        return {
          title: src.letterTitle !== undefined ? src.letterTitle : "",
          content: src.letterBody || src.letterContent || "",
          signature: src.letterSignature !== undefined ? src.letterSignature : ""
        };
      }
    }
    return null;
  }

  const customLetter = getCustomLetterConfig();

  // Khi có dữ liệu cấu hình: nếu người dùng bỏ trống tiêu đề hoặc chữ ký -> để trống hoàn toàn (không tự ý lấy giá trị mặc định)
  // Chỉ khi không có bất kỳ cấu hình nào (demo tĩnh) mới dùng văn bản mẫu
  const letterData = customLetter
    ? {
        title: customLetter.title !== undefined ? String(customLetter.title).trim() : "",
        content: customLetter.content !== undefined ? String(customLetter.content).trim() : (elements.content?.textContent?.trim() || ""),
        signature: customLetter.signature !== undefined ? String(customLetter.signature).trim() : "",
      }
    : {
        title: elements.title?.textContent?.trim() || "",
        content: elements.content?.textContent?.trim() || "",
        signature: elements.signature?.textContent?.trim() || "",
      };

  // Hàm toàn cục cho Server/API cập nhật dữ liệu thư bất kỳ lúc nào
  function setLetterData(data) {
    if (!data || typeof data !== "object") return;
    const titleVal = data.title !== undefined
      ? String(data.title).trim()
      : (data.letterTitle !== undefined ? String(data.letterTitle).trim() : "");
    const contentVal = data.content !== undefined
      ? String(data.content).trim()
      : (data.letterBody !== undefined ? String(data.letterBody).trim() : (data.letterContent !== undefined ? String(data.letterContent).trim() : ""));
    const sigVal = data.signature !== undefined
      ? String(data.signature).trim()
      : (data.letterSignature !== undefined ? String(data.letterSignature).trim() : "");

    letterData.title = titleVal;
    if (contentVal !== undefined && contentVal !== "") {
      letterData.content = contentVal;
    }
    letterData.signature = sigVal;

    window.LOVE_VERSE_DATA = window.LOVE_VERSE_DATA || {};
    window.LOVE_VERSE_DATA.letter = { ...letterData };

    if (elements.title) {
      elements.title.textContent = letterData.title;
      elements.title.hidden = !letterData.title;
      elements.title.style.display = letterData.title ? "" : "none";
    }
    if (elements.content && letterData.content) {
      elements.content.textContent = letterData.content;
    }
    if (elements.signature) {
      elements.signature.textContent = letterData.signature;
      elements.signature.hidden = !letterData.signature;
      elements.signature.style.display = letterData.signature ? "" : "none";
    }
  }

  // Xóa nội dung trước khi chạy hiệu ứng gõ
  const clearLetter = () => {
    if (elements.title) {
      elements.title.textContent = "";
      elements.title.hidden = true;
      elements.title.style.display = "none";
    }
    if (elements.content) {
      elements.content.textContent = "";
    }
    if (elements.signature) {
      elements.signature.textContent = "";
      elements.signature.hidden = true;
      elements.signature.style.display = "none";
    }
    if (elements.continueButton) {
      elements.continueButton.classList.remove("is-visible");
      elements.continueButton.disabled = true;
      elements.continueButton.setAttribute("aria-hidden", "true");
    }
  };

  // Khởi tạo trạng thái ban đầu: xóa và ẩn trước nếu không có tiêu đề / chữ ký
  clearLetter();

  // Hiển thị nút "Tiếp tục" khi hoàn tất
  const showContinueButton = () => {
    if (!elements.continueButton) return;
    elements.continueButton.disabled = false;
    elements.continueButton.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      elements.continueButton.classList.add("is-visible");
    });
  };

  // Bật / tắt con trỏ nhấp nháy
  const setTypingTarget = (el, isTyping) => {
    if (!el) return;
    el.classList.toggle("is-typing", isTyping);
  };

  // Hàm gõ từng ký tự kèm tự động cuộn trang (auto-scroll)
  const typeText = async (el, text, speed) => {
    if (!el || !text) return;

    el.hidden = false;
    el.style.display = "";
    el.textContent = "";
    setTypingTarget(el, true);

    for (let i = 1; i <= text.length; i += 1) {
      el.textContent = text.slice(0, i);

      const letterEl = elements.envelope?.querySelector(".reveal-letter");
      if (letterEl) {
        letterEl.scrollTop = letterEl.scrollHeight;
      }

      await wait(speed);
    }

    setTypingTarget(el, false);
  };

  // Quy trình viết toàn bộ bức thư
  const writeLetter = async (data) => {
    const curData = data || letterData;
    const rawTitle = curData.title ? String(curData.title).trim() : "";
    const rawContent = curData.content ? String(curData.content).trim() : "";
    const rawSig = curData.signature ? String(curData.signature).trim() : "";

    if (prefersReducedMotion) {
      if (elements.title) {
        elements.title.textContent = rawTitle;
        elements.title.hidden = !rawTitle;
        elements.title.style.display = rawTitle ? "" : "none";
      }
      if (elements.content) {
        elements.content.textContent = rawContent;
      }
      if (elements.signature) {
        elements.signature.textContent = rawSig;
        elements.signature.hidden = !rawSig;
        elements.signature.style.display = rawSig ? "" : "none";
      }
      showContinueButton();
      return;
    }

    clearLetter();

    // 1. Gõ tiêu đề (chỉ gõ khi có nội dung tiêu đề, nếu không nhập thì hoàn toàn không hiển thị)
    if (rawTitle.length > 0) {
      await typeText(elements.title, rawTitle, TYPE_SPEED.title);
      await wait(TYPE_SPEED.pauseBetween);
    } else {
      if (elements.title) {
        elements.title.textContent = "";
        elements.title.hidden = true;
        elements.title.style.display = "none";
      }
    }

    // 2. Gõ nội dung chính
    if (rawContent.length > 0) {
      await typeText(elements.content, rawContent, TYPE_SPEED.content);
      await wait(TYPE_SPEED.pauseBetween);
    }

    // 3. Gõ chữ ký (chỉ gõ khi có chữ ký, nếu không nhập thì hoàn toàn không hiển thị)
    if (rawSig.length > 0) {
      await typeText(elements.signature, rawSig, TYPE_SPEED.signature);
    } else {
      if (elements.signature) {
        elements.signature.textContent = "";
        elements.signature.hidden = true;
        elements.signature.style.display = "none";
      }
    }

    await wait(TYPE_SPEED.pauseBetween);
    // 4. Kích hoạt nút tiếp tục
    showContinueButton();
  };

  // 3. ĐIỀU PHỐI TIMELINE MỞ PHONG BÌ
  function bindOpenEnvelope(customLetterData) {
    if (openBound || !elements.openButton) return;
    openBound = true;

    clearLetter();

    elements.openButton.addEventListener("click", () => {
      if (isEnvelopeOpened) return;
      isEnvelopeOpened = true;

      // Luôn lấy dữ liệu thư mới nhất tại thời điểm người dùng bấm mở
      const dataToUse = customLetterData || letterData;

      // T = 0ms: Kích hoạt lật nắp 3D
      elements.envelope.classList.add("active");

      // T = 720ms: Nắp đã mở hết -> rút thư lên
      window.setTimeout(() => {
        elements.envelope.classList.add("extracting");
      }, 720);

      // T = 1820ms: Rút thư xong -> phong bì biến mất, thư đáp giữa màn hình & gõ chữ
      window.setTimeout(() => {
        elements.envelope.classList.add("lowered");
        writeLetter(dataToUse);
      }, 1820);
    }, { once: true });
  }

  // 4. Hàm hiển thị màn hình lá thư
  function showLetterBirthday() {
    if (!elements.screen) return;
    if (window._bouquetBtnTimer) clearTimeout(window._bouquetBtnTimer);
    elements.screen.classList.add("is-active");
    elements.screen.setAttribute("aria-hidden", "false");
    bindOpenEnvelope();

    // Khi màn thư đã che phủ hoàn toàn (sau 650ms), ẩn màn bó hoa để giải phóng tài nguyên và tránh bị lộ hình
    window.setTimeout(() => {
      const bouquetWrap = document.getElementById("bouquet-wrap");
      if (bouquetWrap) {
        bouquetWrap.classList.add("hidden-bouquet");
        bouquetWrap.style.display = "none";
        const btn = bouquetWrap.querySelector(".letter-btn-wrapper");
        if (btn) btn.classList.remove("show-btn");
      }
      const introTextScreen = document.getElementById("intro-text-screen");
      if (introTextScreen) {
        introTextScreen.classList.add("hidden");
        introTextScreen.style.display = "none";
      }
    }, 700);
  }

  // Hàm ẩn màn hình lá thư
  function hideLetterBirthday() {
    if (!elements.screen) return;
    elements.screen.classList.remove("is-active");
    elements.screen.setAttribute("aria-hidden", "true");
  }

  // 5. Bắt sự kiện nút mở thư ở trang chính
  if (elements.triggerBtn) {
    elements.triggerBtn.addEventListener("click", () => {
      showLetterBirthday();
    });
  }

  // Bắt sự kiện nút Tiếp tục
  elements.continueButton?.addEventListener("click", () => {
    // 1. Đảm bảo ẩn triệt để bó hoa & màn hình trước đó ngay lập tức
    const bouquetWrap = document.getElementById("bouquet-wrap");
    if (bouquetWrap) {
      bouquetWrap.classList.add("hidden-bouquet");
      bouquetWrap.style.display = "none";
    }
    const introTextScreen = document.getElementById("intro-text-screen");
    if (introTextScreen) {
      introTextScreen.classList.add("hidden");
      introTextScreen.style.display = "none";
    }

    // 2. Kích hoạt hiển thị màn hình kỷ niệm (imageBirthday) mượt mà đè lên trên (z-index: 600)
    if (typeof window.showImageBirthday === "function") {
      window.showImageBirthday();
    }

    // 3. Giữ nền thư ổn định bên dưới trong lúc màn ảnh mờ dần hiện rõ (650ms), sau đó mới ẩn màn thư
    window.setTimeout(() => {
      hideLetterBirthday();
    }, 650);
  });

  // Khởi chạy ngay nếu màn hình đang active sẵn
  if (elements.screen?.classList.contains("is-active")) {
    bindOpenEnvelope();
  }

  // Xuất ra window để gọi từ bất kỳ đâu
  window.showLetterBirthday = showLetterBirthday;
  window.hideLetterBirthday = hideLetterBirthday;
  window.writeLetter = writeLetter;
  window.setLetterData = setLetterData;
});
