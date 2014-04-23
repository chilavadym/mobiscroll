(function ($) {

    $.mobiscroll.themes.wp = {
        minWidth: 76,
        height: 76,
        accent: 'none',
        dateOrder: 'mmMMddDDyy',
        headerText: false,
        showLabel: false,
        iconEmpty: 'star',
        btnWidth: false,
        btnStartClass: 'mbsc-ic mbsc-ic-play3',
        btnStopClass: 'mbsc-ic mbsc-ic-pause2',
        btnResetClass: 'mbsc-ic mbsc-ic-stop2',
        btnLapClass: 'mbsc-ic mbsc-ic-loop2',
        btnHideClass: 'mbsc-ic mbsc-ic-close',
        calPrevIcon: 'mbsc-ic mbsc-ic-arrow-left5',
        calNextIcon: 'mbsc-ic mbsc-ic-arrow-right5',
        onMarkupInserted: function (elm, inst) {
            var click,
                touch,
                active;

            $('.dw', elm).addClass('wp-' + inst.settings.accent);

            $('.dwb-s .dwb', elm).addClass('mbsc-ic mbsc-ic-checkmark');
            $('.dwb-c .dwb', elm).addClass('mbsc-ic mbsc-ic-close');
            $('.dwb-cl .dwb', elm).addClass('mbsc-ic mbsc-ic-close');
            $('.dwb-n .dwb', elm).addClass('mbsc-ic mbsc-ic-loop2');
            $('.dwwbp', elm).addClass('mbsc-ic mbsc-ic-plus');
            $('.dwwbm', elm).addClass('mbsc-ic mbsc-ic-minus');
            
            $('.dwwl', elm).on('touchstart mousedown DOMMouseScroll mousewheel', function (e) {
                if (e.type === 'mousedown' && touch) {
                    return;
                }
                touch = e.type === 'touchstart';
                click = true;
                active = $(this).hasClass('wpa');
                $('.dwwl', elm).removeClass('wpa');
                $(this).addClass('wpa');
            }).on('touchmove mousemove', function () {
                click = false;
            }).on('touchend mouseup', function (e) {
                if (click && active && $(e.target).closest('.dw-li').hasClass('dw-sel')) {
                    $(this).removeClass('wpa');
                }
                if (e.type === 'mouseup') {
                    touch = false;
                }
                click = false;
            });
        },
        onThemeLoad: function (lang, s) {
            if (lang && lang.dateOrder && !s.dateOrder) {
                var ord = lang.dateOrder;
                ord = ord.match(/mm/i) ? ord.replace(/mmMM|mm|MM/,  'mmMM') : ord.replace(/mM|m|M/,  'mM');
                ord = ord.match(/dd/i) ? ord.replace(/ddDD|dd|DD/,  'ddDD') : ord.replace(/dD|d|D/,  'dD');
                s.dateOrder = ord;
            }
        }
    };

    $.mobiscroll.themes['wp light'] = $.mobiscroll.themes.wp;

})(jQuery);


