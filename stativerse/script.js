/* ============================================================
   StatiVerse — script.js
   ------------------------------------------------------------
   Logika UI sidebar (gaya Gemini):
   1. Toggle buka/tutup sidebar (push / collapse system)
   2. Perpindahan state menu aktif + panel view
   3. Kolom pencarian di dalam sidebar
   4. Penyimpanan state sidebar (localStorage)
   Catatan: logika simulasi data & kuis belum diimplementasikan.
   ============================================================ */

(function () {
  "use strict";

  var BREAKPOINT = 900; // sinkron dengan breakpoint CSS
  var STORAGE_KEY = "stativerse:sidebar-collapsed";

  var app = document.querySelector(".app");
  var sidebar = document.getElementById("sidebar");
  var btnSidebarToggle = document.getElementById("btn-sidebar-toggle");
  var btnTopbarToggle = document.getElementById("btn-topbar-toggle");
  var btnSidebarSearch = document.getElementById("btn-sidebar-search");
  var searchPanel = document.getElementById("sidebar-search");
  var searchInput = document.getElementById("sidebar-search-input");
  var navList = document.getElementById("nav-list");
  var navEmpty = document.getElementById("nav-empty");
  var scrim = document.getElementById("sidebar-scrim");
  var viewTitle = document.getElementById("view-title");
  var viewEyebrow = document.getElementById("view-eyebrow");

  if (!app || !sidebar) {
    return;
  }

  /* ---------- 1. TOGGLE SIDEBAR ---------- */

  function isMobile() {
    return window.innerWidth <= BREAKPOINT;
  }

  function isClosed() {
    return app.classList.contains("is-sidebar-closed");
  }

  /** Sinkronkan aria-expanded / label pada kedua tombol toggle. */
  function syncToggleA11y() {
    var closed = isClosed();
    var state = closed ? "false" : "true";
    var label = closed ? "Buka sidebar" : "Tutup sidebar";

    [btnSidebarToggle, btnTopbarToggle].forEach(function (btn) {
      if (!btn) {
        return;
      }
      btn.setAttribute("aria-expanded", state);
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    });
  }

  /**
   * Buka atau tutup sidebar.
   * @param {boolean} [force] true = tutup, false = buka
   */
  function setSidebar(force) {
    var shouldClose = typeof force === "boolean" ? force : !isClosed();

    app.classList.toggle("is-sidebar-closed", shouldClose);
    document.body.classList.toggle("is-sidebar-open", !shouldClose);

    if (!isMobile()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, shouldClose ? "1" : "0");
      } catch (err) {
        /* localStorage bisa diblokir — abaikan */
      }
    }

    syncToggleA11y();

    // Pindahkan fokus keluar dari sidebar yang sedang ditutup
    if (shouldClose && isMobile() && btnTopbarToggle) {
      var active = document.activeElement;
      if (active && sidebar.contains(active) && typeof btnTopbarToggle.focus === "function") {
        btnTopbarToggle.focus();
      }
    }
  }

  function toggleSidebar() {
    setSidebar(!isClosed());
  }

  [btnSidebarToggle, btnTopbarToggle, scrim].forEach(function (el) {
    if (el) {
      el.addEventListener("click", toggleSidebar);
    }
  });

  // Escape menutup sidebar pada layar kecil
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isMobile() && !isClosed()) {
      setSidebar(true);
    }
  });

  // Terapkan state awal (hanya desktop yang mengingat preferensi)
  (function applyInitialState() {
    var saved = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      saved = null;
    }

    if (isMobile()) {
      setSidebar(true); // mobile: mulai tertutup agar konten penuh
      return;
    }

    setSidebar(saved === "1");
  })();

  window.addEventListener("resize", syncToggleA11y);

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(syncToggleA11y, 150);
  });

  /* ---------- 2. MENU AKTIF & PANEL VIEW ---------- */

  var navItems = Array.prototype.slice.call(
    document.querySelectorAll("#nav-list .nav__item")
  );
  var views = Array.prototype.slice.call(document.querySelectorAll(".view"));

  var PAGE_META = {
    dashboard: { eyebrow: "Statistika", title: "Dashboard Pembelajaran Statistika" },
    materi: { eyebrow: "Materi", title: "Materi Pembelajaran" },
    permainan: { eyebrow: "Permainan", title: "Permainan Statistika" },
    evaluasi: { eyebrow: "Evaluasi", title: "Evaluasi Pembelajaran" },
    pengembang: { eyebrow: "Pengembang", title: "Tentang Pengembang" }
  };

  /**
   * Tandai satu menu aktif (kelas .is-active), hapus dari yang lain,
   * lalu tampilkan panel view yang sesuai.
   * @param {string} key dashboard|materi|permainan|evaluasi|pengembang
   */
  function activateMenu(key) {
    navItems.forEach(function (item) {
      var isMatch = item.getAttribute("data-menu") === key;
      item.classList.toggle("is-active", isMatch);
      if (isMatch) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });

    views.forEach(function (view) {
      var isMatch = view.getAttribute("data-view") === key;
      view.classList.toggle("is-active", isMatch);
      view.hidden = !isMatch;
    });

    var meta = PAGE_META[key];
    if (meta) {
      if (viewTitle) {
        viewTitle.textContent = meta.title;
      }
      if (viewEyebrow) {
        viewEyebrow.textContent = meta.eyebrow;
      }
      document.title = "StatiVerse — " + meta.eyebrow;
    }

    // Di mobile, tutup sidebar setelah memilih menu
    if (isMobile()) {
      setSidebar(true);
    }
  }

  navItems.forEach(function (item) {
    item.addEventListener("click", function (event) {
      event.preventDefault();
      var key = item.getAttribute("data-menu");
      if (key) {
        activateMenu(key);
      }
    });
  });

  // Brand mengarah ke Dashboard
  var brandLink = document.querySelector(".brand[data-menu-link]");
  if (brandLink) {
    brandLink.addEventListener("click", function (event) {
      event.preventDefault();
      activateMenu(brandLink.getAttribute("data-menu-link"));
    });
  }


  /* ---------- 3. PENCARIAN DI SIDEBAR ---------- */

  /**
   * Buka/tutup panel pencarian sidebar.
   * @param {boolean} open
   */
  function expandSearch(open) {
    if (!searchPanel || !btnSidebarSearch) {
      return;
    }

    searchPanel.hidden = !open;
    btnSidebarSearch.setAttribute("aria-expanded", open ? "true" : "false");

    if (open && searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  if (btnSidebarSearch) {
    btnSidebarSearch.addEventListener("click", function () {
      expandSearch(searchPanel ? searchPanel.hidden : true);
    });
  }

  /** Saring item menu berdasarkan kata kunci. */
  function filterMenu(term) {
    var query = term.trim().toLowerCase();
    var visible = 0;

    navItems.forEach(function (item) {
      var text = item.textContent.toLowerCase();
      var match = query === "" || text.indexOf(query) !== -1;
      item.parentNode.hidden = !match;
      if (match) {
        visible += 1;
      }
    });

    if (navEmpty) {
      navEmpty.hidden = visible !== 0;
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      filterMenu(searchInput.value);
    });

    // Escape: kosongkan pencarian & tutup panel
    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        searchInput.value = "";
        filterMenu("");
        expandSearch(false);
        if (btnSidebarSearch) {
          btnSidebarSearch.focus();
        }
      }
    });
  }

  /* ---------- 4. LOGIN & PROFIL SISWA ---------- */

  var SISWA_KEY = "stativerse:siswa";

  var loginModal = document.getElementById("login-modal");
  var loginForm = document.getElementById("login-form");
  var loginNama = document.getElementById("login-nama");
  var loginKelas = document.getElementById("login-kelas");
  var errorNama = document.getElementById("error-nama");
  var errorKelas = document.getElementById("error-kelas");
  var profileAvatar = document.getElementById("profile-avatar");
  var profileName = document.getElementById("profile-name");
  var profileKelas = document.getElementById("profile-kelas");
  var btnLogout = document.getElementById("btn-logout");

  /** Baca data siswa dari localStorage. @returns {{nama:string,kelas:string}|null} */
  function getSiswa() {
    try {
      var raw = window.localStorage.getItem(SISWA_KEY);
      if (!raw) {
        return null;
      }
      var data = JSON.parse(raw);
      if (
        data &&
        typeof data.nama === "string" &&
        typeof data.kelas === "string" &&
        data.nama.trim() &&
        data.kelas.trim()
      ) {
        return { nama: data.nama.trim(), kelas: data.kelas.trim() };
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  /** Simpan data siswa ke localStorage. */
  function setSiswa(data) {
    try {
      window.localStorage.setItem(SISWA_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      return false;
    }
  }

  /** Hapus data siswa dari localStorage. */
  function clearSiswa() {
    try {
      window.localStorage.removeItem(SISWA_KEY);
    } catch (err) {
      /* abaikan */
    }
  }

  /**
   * Ambil inisial dari nama: "Achmad Safikurrohman" -> "AS".
   * Nama satu kata diambil 2 huruf pertama.
   */
  function getInitials(nama) {
    var parts = nama.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "?";
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /** Tampilkan data siswa ke widget profil sidebar. */
  function renderProfile(siswa) {
    if (!siswa) {
      return;
    }
    if (profileAvatar) {
      profileAvatar.textContent = getInitials(siswa.nama);
    }
    if (profileName) {
      profileName.textContent = siswa.nama;
      profileName.setAttribute("title", siswa.nama);
    }
    if (profileKelas) {
      profileKelas.textContent = siswa.kelas;
    }
  }

  /** Buka/tutup modal login. */
  function toggleLoginModal(open) {
    if (!loginModal) {
      return;
    }
    loginModal.hidden = !open;
    document.body.classList.toggle("is-modal-open", open);

    if (open && loginNama && !loginNama.value) {
      // Prefill dari data tersimpan bila ada, lalu fokus ke field pertama
      var siswa = getSiswa();
      if (siswa) {
        loginNama.value = siswa.nama;
        if (loginKelas) {
          loginKelas.value = siswa.kelas;
        }
      }
      window.setTimeout(function () {
        loginNama.focus();
      }, 60);
    }
  }

  /** Tampilkan/bersihkan pesan error form. */
  function setFieldError(input, errorEl, hasError, message) {
    if (!input || !errorEl) {
      return;
    }
    errorEl.hidden = !hasError;
    if (message) {
      errorEl.textContent = message;
    }
    input.classList.toggle("is-invalid", hasError);
    input.setAttribute("aria-invalid", hasError ? "true" : "false");
  }

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var nama = loginNama ? loginNama.value.trim() : "";
      var kelas = loginKelas ? loginKelas.value.trim() : "";
      var namaValid = nama.length >= 3;
      var kelasValid = kelas.length >= 1;

      setFieldError(loginNama, errorNama, !namaValid);
      setFieldError(loginKelas, errorKelas, !kelasValid);

      if (!namaValid || !kelasValid) {
        if (!namaValid && loginNama) {
          loginNama.focus();
        } else if (loginKelas) {
          loginKelas.focus();
        }
        return;
      }

      var siswa = { nama: nama, kelas: kelas };
      setSiswa(siswa);
      renderProfile(siswa);
      toggleLoginModal(false);
    });
  }

  // Hapus penanda error begitu pengguna mengetik ulang
  [loginNama, loginKelas].forEach(function (input) {
    if (input) {
      input.addEventListener("input", function () {
        input.classList.remove("is-invalid");
        input.setAttribute("aria-invalid", "false");
      });
    }
  });

  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      clearSiswa();

      if (profileAvatar) {
        profileAvatar.textContent = "?";
      }
      if (profileName) {
        profileName.textContent = "Belum masuk";
        profileName.removeAttribute("title");
      }
      if (profileKelas) {
        profileKelas.textContent = "Silakan login";
      }

      if (loginForm) {
        loginForm.reset();
      }
      setFieldError(loginNama, errorNama, false);
      setFieldError(loginKelas, errorKelas, false);

      toggleLoginModal(true);
    });
  }

  // Modal login wajib tampil bila data siswa belum tersimpan
  (function initLogin() {
    if (getSiswa()) {
      renderProfile(getSiswa());
      toggleLoginModal(false);
    } else {
      toggleLoginModal(true);
    }
  })();

  /* ---------- 5. EVALUASI: DATA & RENDER CARD ---------- */

  var ICON = {
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5Z"/><path d="M8.5 7.5h6"/>',
    chart: '<path d="M4 20V4"/><path d="M20 20V4"/><path d="M12 7v10"/><path d="M4 20h16"/>',
    brain: '<path d="M12 5a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V8a3 3 0 0 0-3-3Z"/><path d="M9 9H7a2 2 0 0 0 0 4h2"/><path d="M15 11h2a2 2 0 0 1 0 4h-2"/><path d="M9 15H8a2 2 0 0 0 0 4h1"/><path d="M15 7h1a2 2 0 0 0 0-4h-1"/>',
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'
  };

  /**
   * Data paket evaluasi — sumber tunggal untuk render card.
   * @type {Array<{id:string,tone:string,level:string,title:string,desc:string,
   *   icon:string,soal:number,menit:number}>}
   */
  var EVAL_PACKS = [
    {
      id: "lots",
      tone: "blue",
      level: "Dasar · C1–C2",
      title: "LOTS",
      desc: "Soal mengingat dan memahami konsep dasar: definisi, rumus, serta membaca data sederhana.",
      icon: "book",
      soal: 10,
      menit: 10
    },
    {
      id: "mots",
      tone: "emerald",
      level: "Menengah · C3–C4",
      title: "MOTS",
      desc: "Soal penerapan dan analisis: menghitung mean, median, dan modus dari data nyata.",
      icon: "chart",
      soal: 12,
      menit: 15
    },
    {
      id: "hots",
      tone: "purple",
      level: "Lanjutan · C5–C6",
      title: "HOTS",
      desc: "Soal mengevaluasi dan mencipta: menilai kesimpulan data serta menyusun strategi penyelesaian.",
      icon: "brain",
      soal: 8,
      menit: 20
    },
    {
      id: "campuran",
      tone: "amber",
      level: "Komprehensif",
      title: "Campuran",
      desc: "Kombinasi soal LOTS, MOTS, dan HOTS untuk simulasi evaluasi menyeluruh.",
      icon: "shuffle",
      soal: 25,
      menit: 35
    }
  ];

  function svgIcon(paths) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>"
    );
  }

  /** Bangun markup satu card evaluasi dari objek data. */
  function buildEvalCard(pack) {
    return (
      '<article class="eval-card eval-card--' + pack.tone + '">' +
        '<div class="eval-card__top">' +
          '<span class="eval-card__icon">' + svgIcon(ICON[pack.icon]) + "</span>" +
          '<span class="eval-card__badge">' + pack.level + "</span>" +
        "</div>" +
        '<h3 class="eval-card__title">' + pack.title + "</h3>" +
        '<p class="eval-card__desc">' + pack.desc + "</p>" +
        '<div class="eval-card__meta">' +
          "<span>" + svgIcon(ICON.list) + "<strong>" + pack.soal + "</strong> soal</span>" +
          "<span>" + svgIcon(ICON.clock) + "&plusmn; <strong>" + pack.menit + "</strong> menit</span>" +
        "</div>" +
        '<button class="eval-card__btn" type="button" data-start="' + pack.id + '">' +
          "Mulai Kuis" + svgIcon(ICON.arrow) +
        "</button>" +
      "</article>"
    );
  }

  /** Render seluruh card ke dalam grid #eval-grid. */
  function renderEvalCards() {
    var grid = document.getElementById("eval-grid");
    if (!grid) {
      return;
    }
    grid.innerHTML = EVAL_PACKS.map(buildEvalCard).join("");
  }

  renderEvalCards();

  // Delegasi klik untuk tombol "Mulai Kuis"
  (function bindEvalButtons() {
    var grid = document.getElementById("eval-grid");
    if (!grid) {
      return;
    }

    grid.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-start]");
      if (!trigger) {
        return;
      }

      var pack = null;
      for (var i = 0; i < EVAL_PACKS.length; i += 1) {
        if (EVAL_PACKS[i].id === trigger.getAttribute("data-start")) {
          pack = EVAL_PACKS[i];
          break;
        }
      }

      if (pack) {
        startQuiz(pack);
      }
    });
  })();

  /* ---------- 6. BANK SOAL ---------- */

  /**
   * Bank soal per paket. Setiap soal:
   * @type {Array<{q:string, opsi:string[], jawaban:number, pembahasan:string,
   *   indikator:string, level:string}>}
   */
  var QUESTION_BANK = {
    lots: [
      {
        q: "Diberikan data nilai ulangan: 7, 8, 9, 8, 6, 10, 8. Nilai yang paling sering muncul disebut...",
        opsi: ["Jangkauan (range)", "Median", "Modus", "Rerata (mean)"],
        jawaban: 2,
        indikator: "Mengidentifikasi istilah modus dari definisi dasarnya.",
        level: "Level 1: Pengetahuan",
        pembahasan:
          "Modus adalah nilai yang memiliki frekuensi kemunculan tertinggi dalam suatu set data. " +
          "Pada data tersebut, nilai 8 muncul sebanyak 3 kali, lebih sering dari nilai lainnya."
      },
      {
        q: "Nilai tengah dari data yang telah diurutkan disebut...",
        opsi: ["Mean", "Median", "Modus", "Kuartil"],
        jawaban: 1,
        indikator: "Menjelaskan pengertian median.",
        level: "Level 1: Pengetahuan",
        pembahasan:
          "Median adalah nilai tengah setelah data diurutkan dari terkecil ke terbesar. " +
          "Untuk n ganjil, median adalah data ke-(n+1)/2; untuk n genap diambil rata-rata dua data tengah."
      },
      {
        q: "Rumus mean untuk data tunggal adalah...",
        opsi: [
          "Jumlah data dibagi banyaknya data",
          "Data terbesar dikurangi data terkecil",
          "Nilai yang paling sering muncul",
          "Data tengah setelah diurutkan"
        ],
        jawaban: 0,
        indikator: "Menyebutkan rumus mean data tunggal.",
        level: "Level 1: Pengetahuan",
        pembahasan:
          "Mean (rata-rata) diperoleh dengan menjumlahkan seluruh data lalu membaginya dengan " +
          "banyaknya data: Mean = Σx ÷ n."
      },
      {
        q: "Data: 4, 6, 7, 9, 12. Jangkauan (range) dari data tersebut adalah...",
        opsi: ["5", "6", "7", "8"],
        jawaban: 3,
        indikator: "Menghitung jangkauan data.",
        level: "Level 1: Pengetahuan",
        pembahasan: "Jangkauan = data terbesar − data terkecil = 12 − 4 = 8."
      },
      {
        q: "Ukuran pemusatan data yang paling terpengaruh oleh nilai ekstrem (outlier) adalah...",
        opsi: ["Modus", "Median", "Mean", "Kuartil bawah"],
        jawaban: 2,
        indikator: "Mengenali sifat mean terhadap outlier.",
        level: "Level 2: Pemahaman",
        pembahasan:
          "Mean menghitung seluruh nilai, sehingga satu nilai ekstrem dapat menarik rata-rata jauh. " +
          "Median dan modus relatif lebih tahan terhadap outlier."
      }
    ],
    mots: [
      {
        q: "Diberikan data: 6, 7, 7, 8, 9, 10, 10, 10. Nilai mean dari data tersebut adalah...",
        opsi: ["8.0", "8.375", "8.5", "9.0"],
        jawaban: 1,
        indikator: "Menghitung mean dari data tunggal.",
        level: "Level 1: Pengetahuan",
        pembahasan:
          "Jumlah data = 6+7+7+8+9+10+10+10 = 67. Banyak data n = 8. " +
          "Mean = 67 ÷ 8 = 8,375."
      },
      {
        q: "Data: 5, 6, 7, 8, 9, 10 (n = 6). Nilai mediannya adalah...",
        opsi: ["7", "7.5", "8", "8.5"],
        jawaban: 1,
        indikator: "Menghitung median data berjumlah genap.",
        level: "Level 2: Pemahaman",
        pembahasan:
          "Karena n genap, median = rata-rata dua data tengah, yaitu data ke-3 dan ke-4: " +
          "(7 + 8) ÷ 2 = 7,5."
      },
      {
        q: "Nilai ulangan: 70, 75, 80, 85, 90, 95, 100. Jika satu siswa mendapat 100, pernyataan yang tepat adalah...",
        opsi: [
          "Median berubah, modus tetap",
          "Median dan mean sama-sama 85",
          "Mean lebih besar daripada median",
          "Mean lebih kecil daripada median"
        ],
        jawaban: 2,
        indikator: "Membandingkan mean dan median pada data condong.",
        level: "Level 3: Penerapan",
        pembahasan:
          "Mean awal = 595 ÷ 7 = 85, median = 85. Bila ditambah nilai 100, mean naik menjadi " +
          "sekitar 86,88 sedangkan median tetap 85 — mean lebih besar dari median saat data condong ke kanan."
      },
      {
        q: "Data tinggi badan: 150, 152, 155, 155, 158, 160, 160, 160, 165. Modus data tersebut adalah...",
        opsi: ["155 cm", "158 cm", "160 cm", "Tidak ada modus"],
        jawaban: 2,
        indikator: "Menentukan modus dari data tunggal.",
        level: "Level 3: Penerapan",
        pembahasan:
          "Frekuensi tiap nilai: 155 muncul 2 kali, 160 muncul 3 kali. Nilai dengan frekuensi " +
          "tertinggi adalah 160, sehingga modus = 160 cm."
      },
      {
        q: "Diketahui mean dari 9 data adalah 12. Jika satu data bernilai 20 dihapus, mean data yang tersisa adalah...",
        opsi: ["10", "11", "11.5", "12"],
        jawaban: 1,
        indikator: "Menganalisis perubahan mean saat data diubah.",
        level: "Level 4: Analisis",
        pembahasan:
          "Jumlah awal = 9 × 12 = 108. Setelah data 20 dihapus: jumlah = 88, n = 8. " +
          "Mean baru = 88 ÷ 8 = 11."
      }
    ],
    hots: [
      {
        q: "Rata-rata nilai 20 siswa adalah 75. Setelah 5 siswa baru bergabung, rata-rata menjadi 78. Rata-rata nilai 5 siswa baru tersebut adalah...",
        opsi: ["81", "87", "90", "93"],
        jawaban: 2,
        indikator: "Mengevaluasi data gabungan untuk menyimpulkan nilai kelompok baru.",
        level: "Level 5: Evaluasi",
        pembahasan:
          "Jumlah awal = 20 × 75 = 1500. Jumlah total setelah gabung = 25 × 78 = 1950. " +
          "Jumlah 5 siswa baru = 1950 − 1500 = 450, sehingga rata-ratanya 450 ÷ 5 = 90."
      },
      {
        q: "Sebuah data punya mean 60 dan median 80. Kesimpulan yang paling tepat mengenai bentuk distribusinya adalah...",
        opsi: [
          "Distribusi simetris sempurna",
          "Distribusi condong ke kiri (ekor di kiri)",
          "Distribusi condong ke kanan (ekor di kanan)",
          "Tidak dapat disimpulkan dari informasi tersebut"
        ],
        jawaban: 1,
        indikator: "Mengevaluasi hubungan mean dan median untuk menilai kemencengan data.",
        level: "Level 5: Evaluasi",
        pembahasan:
          "Bila mean < median, sebagian kecil nilai rendah menarik rata-rata ke bawah. " +
          "Pola ini menandakan distribusi condong ke kiri, yaitu ekor memanjang di sisi kiri."
      },
      {
        q: "Sebuah toko ingin memilih ukuran sepatu yang paling banyak diproduksi. Ukuran statistik yang paling tepat digunakan adalah...",
        opsi: ["Mean", "Median", "Modus", "Jangkauan"],
        jawaban: 2,
        indikator: "Menciptakan keputusan produksi berbasis ukuran pemusatan yang tepat.",
        level: "Level 6: Mencipta",
        pembahasan:
          "Produksi sebaiknya mengikuti ukuran yang paling banyak dicari, yaitu nilai dengan " +
          "frekuensi tertinggi — itulah modus. Mean pada data ukuran tidak mewakili ukuran yang paling laris."
      },
      {
        q: "Data A memiliki mean 70 dengan simpangan baku kecil, data B memiliki mean 70 dengan simpangan baku besar. Pernyataan yang paling tepat adalah...",
        opsi: [
          "Nilai data A lebih menyebar daripada B",
          "Sebaran data A lebih merata/seragam dibanding B",
          "Kedua data pasti identik karena mean-nya sama",
          "Median A pasti lebih besar daripada B"
        ],
        jawaban: 1,
        indikator: "Mengevaluasi peran ukuran penyebaran dalam menilai konsistensi data.",
        level: "Level 5: Evaluasi",
        pembahasan:
          "Mean yang sama tidak berarti sebaran sama. Simpangan baku kecil menunjukkan nilai " +
          "mengumpul dekat rata-rata (lebih seragam), sedangkan simpangan baku besar menunjukkan sebaran lebih lebar."
      }
    ],
    campuran: [
      {
        q: "Data: 5, 7, 7, 8, 9, 10. Nilai modus dan median berturut-turut adalah...",
        opsi: ["7 dan 7.5", "7 dan 8", "8 dan 7.5", "7.5 dan 7"],
        jawaban: 0,
        indikator: "Menentukan modus dan median dari satu set data.",
        level: "Level 2: Pemahaman",
        pembahasan:
          "Modus = 7 (muncul 2 kali). Untuk n = 6, median = (7 + 8) ÷ 2 = 7,5. " +
          "Jadi modus dan median berturut-turut adalah 7 dan 7,5."
      },
      {
        q: "Nilai rata-rata 15 siswa adalah 80. Jika satu siswa dengan nilai 95 keluar dari kelompok, rata-rata menjadi...",
        opsi: ["78.9", "79.5", "80", "80.5"],
        jawaban: 0,
        indikator: "Menganalisis pengaruh pengurangan data terhadap mean.",
        level: "Level 4: Analisis",
        pembahasan:
          "Jumlah awal = 15 × 80 = 1200. Setelah data 95 keluar: jumlah = 1105, n = 14. " +
          "Mean baru = 1105 ÷ 14 ≈ 78,93 (dibulatkan 78,9)."
      },
      {
        q: "Pernyataan yang benar tentang ukuran pemusatan data adalah...",
        opsi: [
          "Mean selalu lebih kecil dari median",
          "Modus selalu tunggal untuk setiap data",
          "Median tidak terpengaruh nilai ekstrem",
          "Jangkauan termasuk ukuran pemusatan"
        ],
        jawaban: 2,
        indikator: "Mengevaluasi pernyataan konseptual tentang ukuran pemusatan.",
        level: "Level 5: Evaluasi",
        pembahasan:
          "Median hanya bergantung pada posisi tengah setelah data diurutkan, sehingga nilai " +
          "ekstrem tidak menggesernya. Modus bisa lebih dari satu, dan jangkauan adalah ukuran penyebaran."
      }
    ]
  };

  /* ---------- 7. MESIN KUIS (state & render) ---------- */

  var LETTERS = ["A", "B", "C", "D", "E"];

  var quizRunner = document.getElementById("quiz-runner");
  var evalSection = quizRunner ? quizRunner.closest(".section") : null;
  var qNumber = document.getElementById("q-number");
  var qType = document.getElementById("q-type");
  var qLevel = document.getElementById("q-level");
  var qIndicator = document.getElementById("q-indicator");
  var qQuestion = document.getElementById("q-question");
  var qOptions = document.getElementById("q-options");
  var qFeedback = document.getElementById("q-feedback");
  var qFeedbackTitle = document.getElementById("q-feedback-title");
  var qFeedbackText = document.getElementById("q-feedback-text");
  var qProgressText = document.getElementById("q-progress-text");
  var btnPrev = document.getElementById("btn-prev");
  var btnNext = document.getElementById("btn-next");
  var btnCobaLagi = document.getElementById("btn-coba-lagi");
  var btnUnduh = document.getElementById("btn-unduh");
  var btnKembaliPaket = document.getElementById("btn-kembali-paket");
  var donutCorrect = document.querySelector(".donut__ring--correct");
  var donutWrong = document.querySelector(".donut__ring--wrong");
  var donutValue = document.getElementById("donut-value");
  var statTotal = document.getElementById("stat-total");
  var statBenar = document.getElementById("stat-benar");
  var statSalah = document.getElementById("stat-salah");

  // State kuis aktif
  var quiz = {
    pack: null,
    questions: [],
    index: 0,
    answers: [] // null = belum dijawab, angka = indeks opsi terpilih
  };

  /** Hitung total benar & salah dari state jawaban. */
  function tallyAnswers() {
    var benar = 0;
    var salah = 0;

    quiz.answers.forEach(function (picked, idx) {
      if (picked === undefined || picked === null) {
        return;
      }
      if (picked === quiz.questions[idx].jawaban) {
        benar += 1;
      } else {
        salah += 1;
      }
    });

    return { benar: benar, salah: salah, total: quiz.questions.length };
  }

  /** Perbarui donut chart dan angka statistik. */
  function updateScorePanel() {
    var t = tallyAnswers();
    var circumference = 2 * Math.PI * 46;
    var fracBenar = t.total ? t.benar / t.total : 0;
    var fracSalah = t.total ? t.salah / t.total : 0;
    var lenBenar = circumference * fracBenar;
    var lenSalah = circumference * fracSalah;
    var persen = t.total ? Math.round((t.benar / t.total) * 100) : 0;

    if (donutCorrect) {
      donutCorrect.style.strokeDasharray = lenBenar + " " + (circumference - lenBenar);
      donutCorrect.style.strokeDashoffset = "0";
    }
    if (donutWrong) {
      donutWrong.style.strokeDasharray = lenSalah + " " + (circumference - lenSalah);
      donutWrong.style.strokeDashoffset = String(-lenBenar);
    }
    if (donutValue) {
      donutValue.textContent = persen + "%";
    }
    if (statTotal) {
      statTotal.textContent = String(t.total);
    }
    if (statBenar) {
      statBenar.textContent = String(t.benar);
    }
    if (statSalah) {
      statSalah.textContent = String(t.salah);
    }
  }

  /** Render opsi jawaban untuk soal aktif. */
  function renderOptions() {
    var soal = quiz.questions[quiz.index];
    var picked = quiz.answers[quiz.index];
    var answered = picked !== null && picked !== undefined;

    if (!qOptions) {
      return;
    }

    qOptions.innerHTML = soal.opsi
      .map(function (teks, idx) {
        var classes = ["q-option"];

        if (answered) {
          if (idx === soal.jawaban) {
            classes.push("is-correct");
          } else if (idx === picked) {
            classes.push("is-wrong");
          } else {
            classes.push("is-dimmed");
          }
        }

        return (
          '<button type="button" class="' + classes.join(" ") + '" data-opsi="' + idx + '"' +
          (answered ? " disabled" : "") + ">" +
            '<span class="q-option__letter">' + LETTERS[idx] + ".</span>" +
            '<span class="q-option__text">' + teks + "</span>" +
          "</button>"
        );
      })
      .join("");
  }

  /**
   * Tampilkan blok pembahasan.
   * Salah -> judul merah + alasan & jawaban benar.
   * Benar -> judul hijau + penguatan + pembahasan tetap tampil.
   */
  function renderFeedback() {
    var soal = quiz.questions[quiz.index];
    var picked = quiz.answers[quiz.index];
    var answered = picked !== null && picked !== undefined;

    if (!qFeedback || !qFeedbackTitle || !qFeedbackText) {
      return;
    }

    if (!answered) {
      qFeedback.hidden = true;
      return;
    }

    var isCorrect = picked === soal.jawaban;

    qFeedback.hidden = false;
    qFeedback.classList.toggle("is-correct", isCorrect);
    qFeedback.classList.toggle("is-wrong", !isCorrect);

    if (isCorrect) {
      qFeedbackTitle.textContent = "Jawaban benar:";
      qFeedbackText.textContent =
        "Tepat! Jawaban " + LETTERS[soal.jawaban] + " benar. " + soal.pembahasan;
    } else {
      qFeedbackTitle.textContent = "Pembahasan:";
      qFeedbackText.textContent =
        "Jawabanmu " + LETTERS[picked] + " masih kurang tepat. Jawaban yang benar adalah " +
        LETTERS[soal.jawaban] + " (" + soal.opsi[soal.jawaban] + "). " + soal.pembahasan;
    }
  }

  /** Tampilkan soal pada indeks aktif. */
  function renderQuestion() {
    var soal = quiz.questions[quiz.index];

    if (qNumber) {
      qNumber.textContent = "Soal " + (quiz.index + 1);
    }
    if (qType) {
      qType.textContent = quiz.pack ? "Paket " + quiz.pack.title : "Pilihan Ganda";
    }
    if (qLevel) {
      qLevel.textContent = soal.level;
    }
    if (qIndicator) {
      qIndicator.textContent = soal.indikator;
    }
    if (qQuestion) {
      qQuestion.textContent = soal.q;
    }
    if (qProgressText) {
      qProgressText.textContent =
        "Soal " + (quiz.index + 1) + " dari " + quiz.questions.length;
    }

    renderOptions();
    renderFeedback();
    updateScorePanel();

    if (btnPrev) {
      btnPrev.disabled = quiz.index === 0;
    }
    if (btnNext) {
      btnNext.textContent =
        quiz.index === quiz.questions.length - 1 ? "Selesai" : "Soal Berikutnya";
    }
  }

  /** Proses pilihan jawaban siswa (tidak bisa diubah setelah dijawab). */
  function answerQuestion(picked) {
    if (quiz.answers[quiz.index] !== null && quiz.answers[quiz.index] !== undefined) {
      return;
    }
    quiz.answers[quiz.index] = picked;
    renderQuestion();
  }

  /** Mulai kuis untuk paket tertentu. */
  function startQuiz(pack) {
    var bank = QUESTION_BANK[pack.id] || [];

    if (!quizRunner || bank.length === 0) {
      return;
    }

    quiz.pack = pack;
    quiz.questions = bank.slice();
    quiz.index = 0;
    quiz.answers = bank.map(function () {
      return null;
    });

    quizRunner.hidden = false;
    if (evalSection) {
      evalSection.classList.add("is-quizzing");
    }

    renderQuestion();
    quizRunner.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Kembali ke daftar paket. */
  function exitQuiz() {
    if (!quizRunner) {
      return;
    }
    quizRunner.hidden = true;
    if (evalSection) {
      evalSection.classList.remove("is-quizzing");
    }
    quiz.pack = null;
    quiz.questions = [];
    quiz.answers = [];
    quiz.index = 0;
  }

  // Delegasi klik opsi jawaban
  if (qOptions) {
    qOptions.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-opsi]");
      if (!btn || btn.disabled) {
        return;
      }
      answerQuestion(Number(btn.getAttribute("data-opsi")));
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener("click", function () {
      if (quiz.index > 0) {
        quiz.index -= 1;
        renderQuestion();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", function () {
      if (quiz.index < quiz.questions.length - 1) {
        quiz.index += 1;
        renderQuestion();
      } else {
        var t = tallyAnswers();
        if (qProgressText) {
          qProgressText.textContent =
            "Selesai — " + t.benar + " benar, " + t.salah + " salah dari " + t.total + " soal";
        }
      }
    });
  }

  if (btnCobaLagi) {
    btnCobaLagi.addEventListener("click", function () {
      if (quiz.pack) {
        startQuiz(quiz.pack);
      }
    });
  }

  if (btnKembaliPaket) {
    btnKembaliPaket.addEventListener("click", exitQuiz);
  }

  /* ---------- 8. UNDUH HASIL EVALUASI (PDF) ---------- */

  /** Susun elemen laporan HTML untuk dicetak ke PDF. */
  function buildReportElement() {
    var t = tallyAnswers();
    var persen = t.total ? Math.round((t.benar / t.total) * 100) : 0;
    var siswa = getSiswa();

    var wrap = document.createElement("div");
    wrap.style.cssText =
      "padding:32px;font-family:'Plus Jakarta Sans',Segoe UI,sans-serif;" +
      "color:#1c2534;background:#fff;";

    var rows = quiz.questions
      .map(function (soal, idx) {
        var picked = quiz.answers[idx];
        var answered = picked !== null && picked !== undefined;
        var status = !answered
          ? "Belum dijawab"
          : picked === soal.jawaban
          ? "Benar"
          : "Salah";
        var statusColor = !answered
          ? "#8b94a7"
          : picked === soal.jawaban
          ? "#1e8740"
          : "#c53030";
        var jawabSiswa = answered ? LETTERS[picked] + ". " + soal.opsi[picked] : "—";

        return (
          '<tr style="border-bottom:1px solid #e8ecf3;">' +
            '<td style="padding:8px 6px;vertical-align:top;">' + (idx + 1) + "</td>" +
            '<td style="padding:8px 6px;vertical-align:top;">' + soal.q + "</td>" +
            '<td style="padding:8px 6px;vertical-align:top;">' + jawabSiswa + "</td>" +
            '<td style="padding:8px 6px;vertical-align:top;font-weight:700;color:' +
              statusColor + ';">' + status + "</td>" +
          "</tr>"
        );
      })
      .join("");

    wrap.innerHTML =
      '<h1 style="margin:0 0 4px;font-size:22px;">Laporan Hasil Evaluasi — StatiVerse</h1>' +
      '<p style="margin:0 0 16px;color:#56617a;font-size:13px;">Paket: <strong>' +
        (quiz.pack ? quiz.pack.title : "-") + "</strong> · Tanggal: " +
        new Date().toLocaleDateString("id-ID", { dateStyle: "long" }) + "</p>" +
      '<table style="width:100%;margin-bottom:18px;font-size:13px;border-collapse:collapse;">' +
        '<tr><td style="padding:6px 0;"><strong>Nama</strong></td><td>' +
          (siswa ? siswa.nama : "-") + "</td></tr>" +
        '<tr><td style="padding:6px 0;"><strong>Kelas</strong></td><td>' +
          (siswa ? siswa.kelas : "-") + "</td></tr>" +
        '<tr><td style="padding:6px 0;"><strong>Skor</strong></td><td>' +
          t.benar + " benar · " + t.salah + " salah · " + t.total + " soal (" + persen + "%)" +
        "</td></tr>" +
      "</table>" +
      '<table style="width:100%;font-size:12px;border-collapse:collapse;">' +
        '<thead><tr style="background:#f4f6f9;text-align:left;">' +
          '<th style="padding:8px 6px;">No</th>' +
          '<th style="padding:8px 6px;">Soal</th>' +
          '<th style="padding:8px 6px;">Jawabanmu</th>' +
          '<th style="padding:8px 6px;">Status</th>' +
        "</tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>";

    return wrap;
  }

  /**
   * Unduh laporan sebagai PDF memakai html2pdf.js.
   * Bila library gagal dimuat (mis. offline), beri tahu pengguna.
   */
  function downloadReport() {
    if (!btnUnduh) {
      return;
    }

    if (typeof window.html2pdf !== "function") {
      window.alert(
        "Pustaka html2pdf.js belum termuat. Periksa koneksi internet lalu coba lagi."
      );
      return;
    }

    var originalHTML = btnUnduh.innerHTML;
    var element = buildReportElement();
    var namaFile =
      "Laporan-Evaluasi-StatiVerse-" + (quiz.pack ? quiz.pack.title : "Kuis") + ".pdf";

    // Sisipkan sementara ke DOM agar html2pdf bisa mengukur elemen
    element.style.position = "fixed";
    element.style.left = "-9999px";
    element.style.top = "0";
    element.style.width = "820px";
    document.body.appendChild(element);

    btnUnduh.disabled = true;
    btnUnduh.textContent = "Menyiapkan PDF…";

    window
      .html2pdf()
      .set({
        margin: 0,
        filename: namaFile,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "pt", format: "a4", orientation: "portrait" }
      })
      .from(element)
      .save()
      .catch(function () {
        window.alert("Gagal membuat PDF. Silakan coba lagi.");
      })
      .then(function () {
        element.remove();
        btnUnduh.disabled = false;
        btnUnduh.innerHTML = originalHTML;
      });
  }

  if (btnUnduh) {
    btnUnduh.addEventListener("click", downloadReport);
  }

  /* ---------- 9. SINKRONISASI JUMLAH SOAL ---------- */
  // Card paket menampilkan jumlah soal sesuai isi bank soal sebenarnya
  EVAL_PACKS.forEach(function (pack) {
    if (QUESTION_BANK[pack.id]) {
      pack.soal = QUESTION_BANK[pack.id].length;
    }
  });
  renderEvalCards();
})();

