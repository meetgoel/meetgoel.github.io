window.addEventListener('scroll', (e) => {
    const nav = document.querySelector('.header');
    if (window.pageYOffset > 0) {
        nav.classList.add("add-shadow");
    } else {
        nav.classList.remove("add-shadow");
    }
});

$(document).ready(function(){
    $("#top").hide();
    $(document).scroll(function(){
        if($(document).scrollTop() >=800){
            $("#top").fadeIn().show();
            
        }
        else{
            $("#top").fadeOut();
        }
    });
});



// -------------READ MORE BTN-------------

$(document).ready(function(){
    $(".about-para").hide();
    $(".read-more").click(function(){
        $(".about-para").slideToggle();
        // $(".read-more").hide();
      });
});



// ----------------COUNTER-------------
var a = 0;
$(window).scroll(function () {
    var oTop = $("#counter-box").offset().top - window.innerHeight;
    if (a == 0 && $(window).scrollTop() > oTop) {
        $(".count-num").each(function () {
            var $this = $(this),
                countTo = $this.attr("data-number");
            $({
                countNum: $this.text()
            }).animate(
                {
                    countNum: countTo
                },

                {
                    duration: 1500,
                    easing: "swing",
                    step: function () {
                        //$this.text(Math.ceil(this.countNum));
                        $this.text(
                            Math.ceil(this.countNum).toLocaleString("en")
                        );
                    },
                    complete: function () {
                        $this.text(
                            Math.ceil(this.countNum).toLocaleString("en")
                        );
                        //alert('finished');
                    }
                }
            );
        });
        a = 1;
    }
});
$(document).ready(function(){$(".zoom-img").click(function(){this.requestFullscreen()})});

$(document).ready(function(){
    $(".click-all").click(function(){
        $(".gallery-app").show();
        $(".gallery-website").show();
        $(".gallery-software").show();
        $(".gallery-portal").show();
    });
    $(".click-app").click(function(){
        $(".gallery-app").show();
        $(".gallery-website").hide();
        $(".gallery-software").hide();
        $(".gallery-portal").hide();
    });
    $(".click-website").click(function(){
        $(".gallery-app").hide();
        $(".gallery-website").show();
        $(".gallery-software").hide();
        $(".gallery-portal").hide();
    });
    $(".click-portal").click(function(){
        $(".gallery-app").hide();
        $(".gallery-website").hide();
        $(".gallery-software").hide();
        $(".gallery-portal").show();
    });
    $(".click-software").click(function(){
        $(".gallery-app").hide();
        $(".gallery-website").hide();
        $(".gallery-software").show();
        $(".gallery-portal").hide();
    });
    
});
$(document).ready(function(){
    $(".nav-logo").click(function(){
        $(".navbar").slideToggle();
    });
});

