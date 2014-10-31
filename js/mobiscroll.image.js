(function ($) {
    var ms = $.mobiscroll,
        presets = ms.presets.scroller;

    ms.presetShort('image');
    
    presets.image = function (inst) {
        var ret,
            s = inst.settings;

        if (s.enhance) {
            inst._processMarkup =  function (li) {
                var imgCont,
                    liContent = li.children(),
                    isIcon = li.attr('data-icon');
               
                imgCont = $('<div class="mbsc-img-c"></div>');
               
                liContent.each(function (i, v) {
                    v = $(v);
                    if (v.is('img')) {
                        v.addClass('mbsc-img');
                        imgCont.append(v);
                    } else if (v.is('p')) {
                        v.addClass('mbsc-img-txt');
                    }
                });
                
                li.prepend(imgCont);

                if (isIcon) {
                    li.prepend('<div class="img-ic mbsc-ic mbsc-ic-' + isIcon + '"></div');
                }
                
                li.html(' <div class="mbsc-img-w">' + li.html() + '</div>');

                return li.html();
            };
        }
        
        ret = presets.list.call(this, inst);
         
        return ret;
    };
    
})(jQuery);
