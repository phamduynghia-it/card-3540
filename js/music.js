/**
 * ============================================================================
 * LOVEVERSE - BACKGROUND MUSIC CONTROLLER
 * Triển khai theo tài liệu docs/ROUND_MUSIC_BUTTON.md
 * Hỗ trợ phát nhạc nền khi nhấn nút tròn hoàn tất hoặc nhấn trực tiếp nút nhạc
 * ============================================================================
 */

(function () {
  let audioEl = null;
  let toggleBtn = null;
  let iconPlay = null;
  let iconPause = null;
  let tooltip = null;

  // Danh sách nhạc có sẵn trong thư mục assets/musics/
  const DEFAULT_TRACK = "assets/musics/athousandyears.mp3";

  function getMusicUrlFromUrlOrConfig() {
    try {
      const params = new URLSearchParams(window.location.search);
      const musicParam = params.get("music") || params.get("song");
      if (musicParam) {
        if (musicParam.startsWith("http") || musicParam.startsWith("/")) {
          return musicParam;
        }
        if (musicParam.includes("/")) {
          return musicParam;
        }
        return "assets/musics/" + musicParam;
      }
    } catch (_) {}

    // 1. Kiểm tra từ các biến cấu hình (được inject từ config.js)
    const candidates = [
      window.LOVE_VERSE_DATA?.music,
      window.LOVE_VERSE_DATA?.musicUrl,
      window.LOVE_VERSE_DATA?.bgMusic,
      window.LOVE_VERSE_CONFIG?.music,
      window.LOVE_VERSE_CONFIG?.bgMusic,
      window.DN_LOVEGIFT_DATA?.music,
      window.DN_LOVEGIFT_DATA?.bgMusic
    ];

    for (const val of candidates) {
      if (typeof val === "string" && val.trim().length > 0 && !val.includes("BGMUSIC")) {
        return val;
      }
    }

    // 2. Kiểm tra trực tiếp thuộc tính src của thẻ audio hoặc source tag
    const directAudio = document.getElementById("bgMusic");
    const directSrc = directAudio?.getAttribute("src");
    if (directSrc && directSrc.trim().length > 0 && !directSrc.includes("BGMUSIC")) {
      return directSrc;
    }
    const sourceEl = directAudio?.querySelector("source");
    const srcAttr = sourceEl?.getAttribute("src");
    if (srcAttr && srcAttr.trim().length > 0 && !srcAttr.includes("BGMUSIC")) {
      return srcAttr;
    }

    return DEFAULT_TRACK;
  }

  function updateUI(isPlaying) {
    if (!toggleBtn) return;

    if (isPlaying) {
      toggleBtn.classList.add("is-playing");
      if (iconPlay) iconPlay.style.display = "none";
      if (iconPause) iconPause.style.display = "block";
      toggleBtn.title = "Tạm dừng nhạc";
      toggleBtn.setAttribute("aria-label", "Tạm dừng nhạc nền");
      if (tooltip) tooltip.textContent = "Đang phát nhạc ✨";
    } else {
      toggleBtn.classList.remove("is-playing");
      if (iconPlay) iconPlay.style.display = "block";
      if (iconPause) iconPause.style.display = "none";
      toggleBtn.title = "Phát nhạc nền";
      toggleBtn.setAttribute("aria-label", "Phát nhạc nền");
      if (tooltip) tooltip.textContent = "Phát nhạc nền 🎵";
    }
  }

  async function playMusic() {
    if (!audioEl) audioEl = document.getElementById("bgMusic");
    if (!audioEl) return;

    try {
      audioEl.volume = 0.65;
      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        await playPromise;
        updateUI(true);
      }
    } catch (err) {
      console.warn("⚠️ Trình duyệt chặn autoplay âm thanh:", err);
      updateUI(false);

      // Mở khóa phát nhạc ở lần click/chạm tiếp theo của người dùng
      const unlockAudio = () => {
        if (audioEl && audioEl.paused) {
          audioEl.play().then(() => updateUI(true)).catch(() => {});
        }
        window.removeEventListener("pointerdown", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
      };
      window.addEventListener("pointerdown", unlockAudio, { once: true });
      window.addEventListener("keydown", unlockAudio, { once: true });
    }
  }

  function pauseMusic() {
    if (!audioEl) audioEl = document.getElementById("bgMusic");
    if (!audioEl) return;

    audioEl.pause();
    updateUI(false);
  }

  async function toggleMusic() {
    if (!audioEl) audioEl = document.getElementById("bgMusic");
    if (!audioEl) return;

    if (audioEl.paused) {
      await playMusic();
    } else {
      pauseMusic();
    }
  }

  function setTrack(url) {
    if (!url || (typeof url === "string" && url.includes("BGMUSIC"))) return;
    if (!audioEl) audioEl = document.getElementById("bgMusic");
    if (!audioEl) return;

    const isCurrentlyPlaying = !audioEl.paused;
    audioEl.src = url;
    const sourceEl = audioEl.querySelector("source");
    if (sourceEl) {
      sourceEl.src = url;
    }
    audioEl.load();

    if (isCurrentlyPlaying) {
      playMusic();
    }
  }

  function initMusic() {
    audioEl = document.getElementById("bgMusic");
    toggleBtn = document.getElementById("musicToggleBtn");
    iconPlay = document.getElementById("musicIconPlay");
    iconPause = document.getElementById("musicIconPause");
    tooltip = document.getElementById("musicTooltip");

    if (!audioEl) return;

    // Thiết lập bài hát từ URL hoặc cấu hình
    const trackUrl = getMusicUrlFromUrlOrConfig();
    audioEl.src = trackUrl;
    const sourceEl = audioEl.querySelector("source");
    if (sourceEl) {
      sourceEl.src = trackUrl;
    }
    audioEl.load();

    // Đặt âm lượng dịu dàng ban đầu
    audioEl.volume = 0.65;

    // Lắng nghe sự kiện click nếu có nút trên giao diện
    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMusic();
      });
    }

    // Tự động phát nhạc ngay khi người dùng chạm hoặc click lần đầu bất kỳ đâu trên trang
    const handleFirstGesture = () => {
      if (audioEl && audioEl.paused) {
        audioEl.play().then(() => updateUI(true)).catch(() => {});
      }
      window.removeEventListener("pointerdown", handleFirstGesture);
      window.removeEventListener("touchstart", handleFirstGesture);
    };
    window.addEventListener("pointerdown", handleFirstGesture, { once: true });
    window.addEventListener("touchstart", handleFirstGesture, { once: true });

    // Đồng bộ trạng thái khi hệ thống pause/play
    audioEl.addEventListener("play", () => updateUI(true));
    audioEl.addEventListener("pause", () => updateUI(false));
    audioEl.addEventListener("ended", () => updateUI(false));

    // Cập nhật UI ban đầu
    updateUI(!audioEl.paused);
  }

  // Xuất API toàn cục để gọi từ các module khác (như nút tròn intro hoàn tất)
  window.playBgMusic = playMusic;
  window.pauseBgMusic = pauseMusic;
  window.toggleBgMusic = toggleMusic;
  window.setBgMusicTrack = setTrack;
  window.initMusicButton = initMusic;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMusic);
  } else {
    initMusic();
  }
})();
