(function ($, undefined) {
    var ms = $.mobiscroll,
        util = ms.util,
        isString = util.isString,
        defaults = {
            //batch: 40,
            inputClass: '',
            invalid: [],
            rtl: false,
            showInput: true,
            groupLabel: 'Groups',
            checkIcon: 'checkmark',
            dataText: 'text',
            dataValue: 'value',
            dataGroup: 'group',
            dataDisabled: 'disabled'
        };

    ms.presetShort('select');

    ms.presets.scroller.select = function (inst) {
        var $input,
            defaultValue,
            group,
            groupArray,
            groups,
            groupWheelIdx,
            i,
            option,
            optionArray,
            options,
            optionWheelIdx,
            //origValues,
            $elm = $(this),
            orig = $.extend({}, inst.settings),
            s = $.extend(inst.settings, defaults, orig),
            layout = s.layout || (/top|bottom/.test(s.display) ? 'liquid' : ''),
            isLiquid = layout == 'liquid',
            multiple = s.multiple || $elm.prop('multiple'),
            //maxSelect = util.isNumeric(s.multiple) ? s.multiple : Infinity,
            id = this.id + '_dummy',
            lbl = $('label[for="' + this.id + '"]').attr('for', id),
            //selectedClass = 'mbsc-sc-item-sel mbsc-ic mbsc-ic-' + s.checkIcon,
            label = s.label !== undefined ? s.label : (lbl.length ? lbl.text() : $elm.attr('name')),
            hasData = !!s.data,
            hasGroups = hasData ? !!s.group : $('optgroup', $elm).length,
            groupSetup = s.group,
            groupWheel = hasGroups && groupSetup && groupSetup.groupWheel !== false,
            groupSep = hasGroups && groupSetup && groupWheel && groupSetup.clustered === true,
            groupHdr = hasGroups && (!groupSetup || (groupSetup.header !== false && !groupSep)),
            values = $elm.val() || [],
            invalid = [];
        //selectedValues = {};

        function prepareData() {
            var gr,
                lbl,
                opt,
                txt,
                val,
                l = 0,
                c = 0,
                groupIndexes = {};

            options = {};
            groups = {};

            optionArray = [];
            groupArray = [];

            // Reset invalids
            invalid.length = 0;

            if (hasData) {
                $.each(s.data, function (i, v) {
                    txt = v[s.dataText];
                    val = v[s.dataValue];
                    lbl = v[s.dataGroup];
                    opt = {
                        value: val,
                        text: txt,
                        index: i
                    };
                    options[val] = opt;
                    optionArray.push(opt);

                    if (hasGroups) {
                        if (groupIndexes[lbl] === undefined) {
                            gr = {
                                text: lbl,
                                value: c,
                                options: [],
                                index: c
                            };
                            groups[c] = gr;
                            groupIndexes[lbl] = c;
                            groupArray.push(gr);
                            c++;
                        } else {
                            gr = groups[groupIndexes[lbl]];
                        }
                        if (groupSep) {
                            opt.index = gr.options.length;
                        }
                        opt.group = groupIndexes[lbl];
                        gr.options.push(opt);
                    }
                    if (v[s.dataDisabled]) {
                        invalid.push(val);
                    }
                });
            } else {
                if (hasGroups) {
                    $('optgroup', $elm).each(function (i) {
                        groups[i] = {
                            text: this.label,
                            value: i,
                            options: [],
                            index: i
                        };
                        groupArray.push(groups[i]);
                        $('option', this).each(function (j) {
                            opt = {
                                value: this.value,
                                text: this.text,
                                index: groupSep ? j : l++,
                                group: i
                            };
                            options[this.value] = opt;
                            optionArray.push(opt);
                            groups[i].options.push(opt);
                            if (this.disabled) {
                                invalid.push(this.value);
                            }
                        });
                    });
                } else {
                    $('option', $elm).each(function (i) {
                        opt = {
                            value: this.value,
                            text: this.text,
                            index: i
                        };
                        options[this.value] = opt;
                        optionArray.push(opt);
                        if (this.disabled) {
                            invalid.push(this.value);
                        }
                    });
                }
            }

            if (optionArray.length) {
                defaultValue = optionArray[0].value;
            }

            if (groupHdr) {
                optionArray = [];
                l = 0;
                $.each(groups, function (i, gr) {
                    val = '__group' + i;
                    opt = {
                        text: gr.text,
                        value: val,
                        group: i,
                        index: l++,
                        cssClass: 'mbsc-sel-gr'
                    };
                    options[val] = opt;
                    optionArray.push(opt);
                    invalid.push(opt.value);
                    $.each(gr.options, function (j, opt) {
                        opt.index = l++;
                        optionArray.push(opt);
                    });
                });
            }
        }

        function genValues(data, multiple, label) {
            var i,
                //keys = [],
                values = [];

            for (i = 0; i < data.length; i++) {
                values.push({
                    value: data[i].value,
                    text: data[i].text,
                    cssClass: data[i].cssClass
                });
            }

            return {
                circular: false,
                multiple: multiple,
                values: values,
                //keys: keys,
                label: label
            };
        }

        function genGroupWheel() {
            return genValues(groupArray, false, s.groupLabel);
        }

        function genOptWheel() {
            return genValues(groupSep ? groups[group].options : optionArray, multiple, label);
        }

        function genWheels() {
            var w1,
                w2,
                w = [
                    []
                ];

            if (groupWheel) {
                w1 = genGroupWheel();

                if (isLiquid) {
                    w[0][groupWheelIdx] = w1;
                } else {
                    w[groupWheelIdx] = [w1];
                }
            }

            w2 = genOptWheel();

            if (isLiquid) {
                w[0][optionWheelIdx] = w2;
            } else {
                w[optionWheelIdx] = [w2];
            }

            return w;
        }

        function getOption(v) {
            if (multiple) {
                if (v && isString(v)) {
                    v = v.split(',');
                }
                if ($.isArray(v)) {
                    v = v[0];
                }
            }

            option = v === undefined || v === null || v === '' || !options[v] ? defaultValue : v;

            if (groupWheel) {
                group = options[option] ? options[option].group : null;
                //prevGroup = group;
            }
        }

        function getVal(temp, group) {
            var val = temp ? inst._tempWheelArray : (inst._hasValue ? inst._wheelArray : null);
            return val ? (s.group && group ? val : val[optionWheelIdx]) : null;
        }

        function onFill() {
            // TODO: be able to override formatting
            var txt,
                val,
                sel = [],
                i = 0;

            if (multiple) {
                val = [];

                //for (i in selectedValues) {
                for (i in inst._selected[optionWheelIdx]) {
                    sel.push(options[i] ? options[i].text : '');
                    val.push(i);
                }

                txt = sel.join(', ');
            } else {
                val = option;
                txt = options[option] ? options[option].text : '';
            }

            inst._tempValue = val;

            $input.val(txt);
            $elm.val(val);
        }

        // Inits

        if (!s.invalid.length) {
            s.invalid = invalid;
        }

        if (groupWheel) {
            groupWheelIdx = 0;
            optionWheelIdx = 1;
        } else {
            groupWheelIdx = -1;
            optionWheelIdx = 0;
        }

        if (multiple) {
            $elm.prop('multiple', true);

            inst._selected[optionWheelIdx] = {};

            // TODO: parse ???
            if (values && isString(values)) {
                values = values.split(',');
            }

            for (i = 0; i < values.length; i++) {
                //selectedValues[values[i]] = values[i];
                inst._selected[optionWheelIdx][values[i]] = values[i];
            }
        }

        // Remove dummy element if exists
        // TODO: use something else instead of the id
        $('#' + id).remove();

        // Check if mobiscroll form already initialized this select
        if ($elm.next().is('input.mbsc-control')) {
            $input = $elm.off('.mbsc-form').next().removeAttr('tabindex');
        } else {
            // Create dummy input
            $input = $('<input type="text" id="' + id + '" class="mbsc-control mbsc-control-ev ' + s.inputClass + '" readonly />');

            if (s.showInput) {
                $input.insertBefore($elm);
            }
        }

        // Show scroller on input tap
        inst.attachShow($input.attr('placeholder', s.placeholder || ''));

        $elm.addClass('mbsc-sel-hdn').attr('tabindex', -1);
        // TODO: move this to jqm integation .closest('.ui-field-contain').trigger('create');

        prepareData();

        getOption($elm.val());

        onFill();

        // Extended methods
        // ---

        inst.setVal = function (val, fill, change, temp, time) {
            if (multiple) {
                if (val && isString(val)) {
                    val = val.split(',');
                }
                //selectedValues = util.arrayToObject(val);
                inst._selected[optionWheelIdx] = util.arrayToObject(val);
                inst._tempSelected[optionWheelIdx] = util.arrayToObject(val);
                val = val ? val[0] : null;
            }
            inst._setVal(val, fill, change, temp, time);
        };

        inst.getVal = function (temp, group) {
            if (multiple) {
                return util.objectToArray(temp ? inst._tempSelected[optionWheelIdx] : inst._selected[optionWheelIdx]);
            }
            return getVal(temp, group);
        };

        inst.refresh = function () {
            prepareData();

            s.wheels = genWheels();

            getOption(option);

            inst._tempWheelArray = groupWheel ? [group, option] : [option];

            if (inst._isVisible) {
                inst.changeWheel(groupWheel ? [groupWheelIdx, optionWheelIdx] : [optionWheelIdx]);
            }
        };

        return {
            width: 50,
            layout: layout,
            headerText: false,
            anchor: $input,
            confirmOnTap: groupWheel ? [false, true] : true,
            formatValue: function (d) {
                var i,
                    opt,
                    sel = [];

                if (multiple) {
                    //for (i in selectedValues) {
                    for (i in inst._tempSelected[optionWheelIdx]) {
                        sel.push(options[i] ? options[i].text : '');
                    }
                    return sel.join(', ');
                }

                opt = d[optionWheelIdx];

                return options[opt] ? options[opt].text : '';
            },
            parseValue: function (val) {
                getOption(val === undefined ? $elm.val() : val);
                return groupWheel ? [group, option] : [option];
            },
            validate: function () {
                var disabled = [];

                disabled[optionWheelIdx] = s.invalid;

                return {
                    disabled: disabled
                };
            },
            onValueFill: onFill,
            onBeforeShow: function () {
                if (multiple && s.counter) {
                    s.headerText = function () {
                        var length = 0;
                        $.each(inst._tempSelected[optionWheelIdx], function () {
                            length++;
                        });
                        return (length > 1 ? s.selectedPluralText || s.selectedText : s.selectedText).replace(/{count}/, length);
                    };
                }

                getOption($elm.val());

                inst.settings.wheels = genWheels();
            },
            onWheelStopped: function (ev) {
                var values = inst.getArrayVal(true),
                    wheels = {};

                // TODO: set wheel to readonly
                if (ev.index == groupWheelIdx && values[groupWheelIdx] != group) {
                    group = values[groupWheelIdx];
                    option = groups[group].options[0].value;
                    values[optionWheelIdx] = option;
                    if (groupSep) {
                        wheels[optionWheelIdx] = genOptWheel();
                        inst.changeWheel(wheels);
                    } else {
                        inst.setArrayVal(values, false, false, true);
                    }
                } else if (ev.index == optionWheelIdx && values[optionWheelIdx] != option && groupWheel) {
                    option = values[optionWheelIdx];
                    if (options[option].group != group) {
                        group = options[option].group;
                        values[groupWheelIdx] = group;
                        inst.setArrayVal(values, false, false, true, 200);
                    }
                }
            },
            onValidated: function () {
                // TODO:
                //option = inst._tempWheelArray[optionWheelIdx];
            },
            onDestroy: function () {
                if (!$input.hasClass('mbsc-control')) {
                    $input.remove();
                }
                $elm.removeClass('mbsc-sel-hdn').removeAttr('tabindex');
            }
        };
    };

})(jQuery);
