function fadeInUp() {
  var viewportHeight = window.innerHeight || $(window).height();
  $(".animated").each(function() {
    var $element = $(this);
    if (!$element.hasClass("fadeInUp")) {
      var rect = this.getBoundingClientRect();
      if (rect.top < viewportHeight - 20) {
        $element.addClass("fadeInUp");
      }
    }
  });
}

function scheduleFadeInUp() {
  fadeInUp();
  setTimeout(fadeInUp, 50);
  setTimeout(fadeInUp, 300);
}

function getHomeHeaderFadeDistance() {
  var homeProjects = document.querySelector(".identifier-wrapper.index .home-projects");

  if (!homeProjects) {
    return 84;
  }

  return parseFloat(window.getComputedStyle(homeProjects).marginTop) || 84;
}

function syncHeaderScrollState() {
  var scrollY = window.pageYOffset || document.documentElement.scrollTop;
  var $header = $("header");
  var $homeHeader = $(".identifier-wrapper.index > header");
  var isMobileHome = $homeHeader.length && window.matchMedia("(max-width: 767px)").matches;

  if (isMobileHome) {
    var fadeDistance = getHomeHeaderFadeDistance();
    var progress = fadeDistance > 0 ? Math.min(scrollY / fadeDistance, 1) : 0;

    $homeHeader[0].style.setProperty("--header-fade", String(progress));
    $header.toggleClass("is-scrolled", progress > 0);
    return;
  }

  $homeHeader.each(function() {
    this.style.removeProperty("--header-fade");
  });
  $header.toggleClass("is-scrolled", scrollY > 20);
}

function restartPageAnimations(smoothState) {
  if (smoothState && smoothState.restartCSSAnimations) {
    smoothState.restartCSSAnimations();
  }
}

function playPageVideos() {
  $("#main video").each(function() {
    var video = this;
    video.load();
    var playPromise = video.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function() {});
    }
  });
}

function pageHasHorizon($root) {
  return $root.filter(".identifier-wrapper.horizon-page").length > 0 ||
    $root.find(".identifier-wrapper.horizon-page").length > 0;
}

var horizonBackgroundTimeout;

function syncHorizonBackground($root) {
  var $html = $("html");

  if (pageHasHorizon($root)) {
    $html.addClass("horizon-page");
    $html.removeClass("horizon-page--fading-in horizon-page--fading-out");
    return;
  }

  $html.removeClass("horizon-page horizon-page--fading-in horizon-page--fading-out");
}

function fadeOutHorizonBackground() {
  var $html = $("html");

  if (!$html.hasClass("horizon-page")) {
    return;
  }

  $html.addClass("horizon-page--fading-out");
  clearTimeout(horizonBackgroundTimeout);
  horizonBackgroundTimeout = setTimeout(function() {
    $html.removeClass("horizon-page horizon-page--fading-out horizon-page--fading-in");
  }, 450);
}

function fadeInHorizonBackground($root) {
  if (!pageHasHorizon($root)) {
    return;
  }

  var $html = $("html");

  clearTimeout(horizonBackgroundTimeout);
  $html.removeClass("horizon-page--fading-out");
  $html.addClass("horizon-page horizon-page--fading-in");

  if ($html[0]) {
    void $html[0].offsetHeight;
  }

  horizonBackgroundTimeout = setTimeout(function() {
    $html.removeClass("horizon-page--fading-in");
  }, 20);
}

function closeMobileNav() {
  $("#site-nav").removeClass("is-open");
  $(".header-menu-toggle").removeClass("is-open").attr("aria-expanded", "false");
}

function initMobileNav() {
  closeMobileNav();
}

$(function() {
  scheduleFadeInUp();
  syncHeaderScrollState();
  initMobileNav();
  $(window).on("scroll resize load", fadeInUp);
  $(window).on("scroll resize load", syncHeaderScrollState);
});

$(document).on("click", ".header-menu-toggle", function(event) {
  if (!window.matchMedia("(max-width: 767px)").matches) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  var $toggle = $(this);
  var $nav = $("#site-nav");
  var isOpen = $nav.toggleClass("is-open").hasClass("is-open");

  $toggle.toggleClass("is-open", isOpen).attr("aria-expanded", isOpen ? "true" : "false");
});

$(document).on("click", function(event) {
  if (!window.matchMedia("(max-width: 767px)").matches) {
    return;
  }

  if (!$(event.target).closest("#site-nav, .header-menu-toggle").length) {
    closeMobileNav();
  }
});

$(document).on("click", "#site-nav a", function() {
  if (window.matchMedia("(max-width: 767px)").matches) {
    closeMobileNav();
  }
});

$(document).on("keydown", function(event) {
  if (event.key === "Escape") {
    closeMobileNav();
  }
});

$(function() {
  "use strict";

  var options = {
    debug: false,
    prefetch: true,
    cacheLength: 2,
    onStart: {
      duration: 450,
      render: function($container) {
        $container.removeClass("animate-content-in").addClass("animate-header-out animate-content-out");
        fadeOutHorizonBackground();
        restartPageAnimations(smoothState);
      }
    },
    onReady: {
      duration: 0,
      render: function($container, html) {
        $container.removeClass("animate-header-out animate-content-out").addClass("animate-header-in animate-content-in");
        $container.html(html);
        $container.find("main, .identifier-wrapper > section").css("opacity", "");
        $("html, body").animate({ scrollTop: 0 }, 0);
        syncHeaderScrollState();
        initMobileNav();
        fadeInHorizonBackground($container);
        scheduleFadeInUp();
      }
    },
    onAfter: function() {
      var $container = $("#main");

      setTimeout(function() {
        $container.removeClass("animate-content-in");
        playPageVideos();
        scheduleFadeInUp();
        syncHorizonBackground($container);
      }, 500);
    }
  };

  var smoothState = $("#main").smoothState(options).data("smoothState");
});
