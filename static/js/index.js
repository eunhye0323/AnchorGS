// Initialize the qualitative-results carousel and small UX helpers.
document.addEventListener('DOMContentLoaded', function () {
  // bulma-carousel
  if (window.bulmaCarousel) {
    bulmaCarousel.attach('#results-carousel', {
      slidesToScroll: 1,
      slidesToShow: 2,
      loop: true,
      infinite: true,
      autoplay: true,
      autoplaySpeed: 4000,
      pauseOnHover: true,
      breakpoints: [{ changePoint: 640, slidesToShow: 1, slidesToScroll: 1 }],
    });
  }

  // bulma-slider (if any range sliders are added later)
  if (window.bulmaSlider) {
    bulmaSlider.attach();
  }

  // Play the Baseline-vs-Ours wipe videos only while on screen (10 clips -> avoid
  // decoding them all at once). preload="none" means data loads on first play().
  var cmpVideos = document.querySelectorAll('.video-compare-container video');
  if ('IntersectionObserver' in window && cmpVideos.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.play().catch(function () {}); }
        else { e.target.pause(); }
      });
    }, { threshold: 0.25 });
    cmpVideos.forEach(function (v) { io.observe(v); });
  } else {
    cmpVideos.forEach(function (v) { v.play().catch(function () {}); });
  }
});
