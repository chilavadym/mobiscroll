import mobiscroll from '../core/core';

var empty = function () {},
    $ = mobiscroll.$;

var ProgressBase = function (elm, settings, inherit) {
    var $elm,
        $parent,
        cssClass,
        s,
        that = this;

    // Call the parent constructor
    mobiscroll.classes.Base.call(this, elm, settings, true);

    that.__init = empty;

    that.__destroy = empty;

    that._init = function (ss) {

        var wasInit;

        s = that.settings;

        $elm = $(elm);

        // Check if the element was already initialized
        wasInit = !!$parent;

        $parent = that._$parent = wasInit ? $parent : $elm.parent();

        if (cssClass) {
            $parent.removeClass(cssClass);
        }

        cssClass = that._css + ' mbsc-progress-w mbsc-control-w mbsc-' + s.theme + (s.baseTheme ? ' mbsc-' + s.baseTheme : '') + (s.rtl ? ' mbsc-rtl' : ' mbsc-ltr');

        $parent.addClass(cssClass);

        $elm.addClass('mbsc-control');

        that.__init(ss);

        if (!wasInit) {
            that._attachChange();
        }

        // Show initial value
        that.refresh();
    };

    that._destroy = function () {

        that.__destroy();

        $parent.removeClass(cssClass);

        $elm.removeClass('mbsc-control');
    };

    if (!inherit) {
        that.init(settings);
    }
};

ProgressBase.prototype = {
    _class: 'progressbase'
};

export default ProgressBase;
