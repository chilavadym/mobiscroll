(function ($, undefined) {

    var ms = $.mobiscroll,
        util = ms.util,
        isString = util.isString,
        defaults = {
            batch: 20,
            inputClass: '',
            invalid: [],
            rtl: false,
            showInput: true,
            group: false,
            groupLabel: 'Groups',
            checkIcon: 'checkmark',
            dataText: 'text',
            dataValue: 'value',
            dataGroup: 'group',
            dataDisabled: 'disabled'
        };

    ms.presetShort('select');

    ms.presets.scroller.select = function (inst) {
        var change,
            group,
            groupArray,
            groupChanged,
            groupWheelIdx,
            i,
            input,
            optionArray,
            optionWheelIdx,
            option,
            origValues,
            prevGroup,
            timerGroup,
            timerOpt,
            batchChanged = {},
            batchStart = {},
            batchEnd = {},
            tempBatchStart = {},
            tempBatchEnd = {},
            orig = $.extend({}, inst.settings),
            s = $.extend(inst.settings, defaults, orig),
            batch = s.batch,
            layout = s.layout || (/top|bottom/.test(s.display) ? 'liquid' : ''),
            isLiquid = layout == 'liquid',
            elm = $(this),
            multiple = s.multiple || elm.prop('multiple'),
            id = this.id + '_dummy',
            lbl = $('label[for="' + this.id + '"]').attr('for', id),
            label = s.label !== undefined ? s.label : (lbl.length ? lbl.text() : elm.attr('name')),
            selectedClass = 'dw-msel mbsc-ic mbsc-ic-' + s.checkIcon,
            origReadOnly = s.readonly,
            data = s.data,
            hasData = !!data,
            hasGroups = hasData ? data[0][s.dataGroup] : $('optgroup', elm).length,
            defaultValue = hasData ? data[0][s.dataValue] : $('option', elm).attr('value'),
            groupWheel = hasGroups && s.group,
            groupHdr = hasGroups && !groupWheel,
            values = elm.val() || [],
            invalid = [],
            selectedValues = {},
            options = {},
            groups = {};

        function prepareData() {
            var gr,
                lbl,
                opt,
                txt,
                val,
                l = 0,
                c = 0,
                groupIndexes = {};

            optionArray = [];
            groupArray = [];

            if (hasData) {
                $.each(data, function (i, v) {
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
                            gr = { text: lbl, value: c, options: [], index: c };
                            groups[c] = gr;
                            groupIndexes[lbl] = c;
                            groupArray.push(gr);
                            c++;
                        } else {
                            gr = groups[groupIndexes[lbl]];
                        }
                        opt.index = gr.options.length;
                        opt.group = groupIndexes[lbl];
                        gr.options.push(opt);
                    }
                    if (v[s.dataDisabled]) {
                        invalid.push(val);
                    }
                });
            } else {
                if (hasGroups) {
                    $('optgroup', elm).each(function (i) {
                        groups[i] = { text: this.label, value: i, options: [], index: i };
                        groupArray.push(groups[i]);
                        $('option', this).each(function (j) {
                            opt = {
                                value: this.value,
                                text: this.text,
                                index: j,
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
                    $('option', elm).each(function (i) {
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

            if (groupHdr) {
                optionArray = [];
                $.each(groups, function (i, gr) {
                    val = '__group' + i;
                    opt = {
                        text: gr.text,
                        value: val,
                        index: l++
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

        function genValues(w, data, dataMap, value, index, multiple, label) {
            var i,
                wheel,
                keys = [],
                values = [],
                selectedIndex = dataMap[value].index,
                start = Math.max(0, selectedIndex - batch),
                end = Math.min(data.length - 1, start + batch * 2);

            if (batchStart[index] !== start || batchEnd[index] !== end) {
                for (i = start; i <= end; i++) {
                    values.push(data[i].text);
                    keys.push(data[i].value);
                }
                batchChanged[index] = true;
                tempBatchStart[index] = start;
                tempBatchEnd[index] = end;

                wheel = {
                    multiple: multiple,
                    values: values,
                    keys: keys,
                    label: label
                };

                if (isLiquid) {
                    w[0][index] = wheel;
                } else {
                    w[index] = [wheel];
                }
            } else {
                batchChanged[index] = false;
            }
        }

        function genGroupWheel(w) {
            genValues(w, groupArray, groups, group, groupWheelIdx, false, s.groupLabel);
        }

        function genOptWheel(w) {
            genValues(w, groupWheel ? groups[group].options : optionArray, options, option, optionWheelIdx, multiple, label);
        }

        function genWheels() {
            var w = [[]];

            if (groupWheel) {
                genGroupWheel(w);
            }

            genOptWheel(w);

            return w;
        }

        function getOption(v) {
            if (multiple && $.isArray(v)) {
                v = v[0];
            }

            option = v === undefined || v === null || v === '' ? defaultValue : v;

            if (groupWheel) {
                group = options[option].group;
            }
        }

        function getVal(temp, group) {
            var val = temp ? inst._tempWheelArray : (inst._hasValue ? inst._wheelArray : null);
            return val ? (s.group && group ? val : val[optionWheelIdx]) : null;
        }

        function onFill() {
            var txt,
                val,
                sel = [],
                i = 0;

            if (multiple) {
                val = [];

                for (i in selectedValues) {
                    sel.push(options[i] ? options[i].text : '');
                    val.push(i);
                }

                txt = sel.join(', ');
            } else {
                val = option;
                txt = options[option] ? options[option].text : '';
            }
            
            inst._tempValue = val;

            input.val(txt);
            elm.val(val);
        }

        function onTap(li) {
            var val = li.attr('data-val'),
                selected = li.hasClass('dw-msel');

            if (multiple && li.closest('.dwwl').hasClass('dwwms')) {
                if (li.hasClass('dw-v')) {
                    if (selected) {
                        li.removeClass(selectedClass).removeAttr('aria-selected');
                        delete selectedValues[val];
                    } else {
                        li.addClass(selectedClass).attr('aria-selected', 'true');
                        selectedValues[val] = val;
                    }
                }
                return false;
            }
        }

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
            if (values && isString(values)) {
                values = values.split(',');
            }
            for (i = 0; i < values.length; i++) {
                selectedValues[values[i]] = values[i];
            }
        }

        prepareData();

        getOption(elm.val());

        $('#' + id).remove();

        input = $('<input type="text" id="' + id + '" class="' + s.inputClass + '" placeholder="' + (s.placeholder || '') + '" readonly />');

        if (s.showInput) {
            input.insertBefore(elm);
        }

        inst.attachShow(input);

        elm.addClass('dw-hsel').attr('tabindex', -1).closest('.ui-field-contain').trigger('create');

        onFill();

        // Extended methods
        // ---

        inst.setVal = function (val, fill, change, temp, time) {
            if (multiple) {
                if (val && isString(val)) {
                    val = val.split(',');
                }
                selectedValues = util.arrayToObject(val);
                val = val ? val[0] : null;
            }
            inst._setVal(val, fill, change, temp, time);
        };

        inst.getVal = function (temp, group) {
            if (multiple) {
                return util.objectToArray(selectedValues);
            }
            return getVal(temp, group);
        };

        // @deprecated since 2.14.0, backward compatibility code
        // ---
        inst.getValues = inst.getVal;

        inst.getValue = getVal;
        // ---

        // ---

        return {
            width: 50,
            layout: layout,
            headerText: false,
            anchor: input,
            formatResult: function (d) {
                var i,
                    sel = [];

                if (multiple) {
                    for (i in selectedValues) {
                        sel.push(options[i] ? options[i].text : '');
                    }
                    return sel.join(', ');
                }

                option = d[optionWheelIdx];
                return options[option] ? options[option].text : '';
            },
            parseValue: function (val) {
                getOption(val === undefined ? elm.val() : val);
                return groupWheel ? [group, option] : [option];
            },
            onValueTap: onTap,
            onValueFill: onFill,
            onBeforeShow: function () {
                if (multiple && s.counter) {
                    s.headerText = function () {
                        var length = 0;
                        $.each(selectedValues, function () {
                            length++;
                        });
                        return length + ' ' + s.selectedText;
                    };
                }

                getOption(elm.val());

                if (groupWheel) {
                    prevGroup = group;
                    inst._tempWheelArray = [group, option];
                }

                prepareData();

                batchStart = {};
                batchEnd = {};

                s.wheels = genWheels();

                batchStart[groupWheelIdx] = tempBatchStart[groupWheelIdx];
                batchEnd[groupWheelIdx] = tempBatchEnd[groupWheelIdx];
                batchStart[optionWheelIdx] = tempBatchStart[optionWheelIdx];
                batchEnd[optionWheelIdx] = tempBatchEnd[optionWheelIdx];

                // Prevent wheel generation on initial validation
                change = true;
            },
            onMarkupReady: function (dw) {
                dw.addClass('dw-select');

                $('.dwwl' + groupWheelIdx, dw).on('mousedown touchstart', function () {
                    clearTimeout(timerGroup);
                    if (groupChanged) {
                        clearTimeout(timerOpt);
                    }
                });

                $('.dwwl' + optionWheelIdx, dw).on('mousedown touchstart', function () {
                    if (!groupChanged) {
                        clearTimeout(timerOpt);
                    }
                });

                if (groupHdr) {
                    $('.dw', dw).addClass('dw-select-gr');
                }

                if (multiple) {
                    dw.addClass('dwms');

                    $('.dwwl', dw).on('keydown', function (e) {
                        if (e.keyCode == 32) { // Space
                            e.preventDefault();
                            e.stopPropagation();
                            onTap($('.dw-sel', this));
                        }
                    }).eq(optionWheelIdx).addClass('dwwms').attr('aria-multiselectable', 'true');

                    origValues = $.extend({}, selectedValues);
                }
            },
            validate: function (dw, i, time) {
                var j,
                    v,
                    ret,
                    temp = inst.getArrayVal(true),
                    t = $('.dw-ul', dw).eq(optionWheelIdx);

                if (i === undefined && multiple) {
                    v = selectedValues;
                    j = 0;

                    $('.dwwl' + optionWheelIdx + ' .dw-li', dw).removeClass(selectedClass).removeAttr('aria-selected');

                    for (j in v) {
                        $('.dwwl' + optionWheelIdx + ' .dw-li[data-val="' + v[j] + '"]', dw).addClass(selectedClass).attr('aria-selected', 'true');
                    }
                }

                if (groupWheel && (i === undefined || i === groupWheelIdx)) {
                    group = +temp[groupWheelIdx];
                    groupChanged = false;
                    if (group !== prevGroup) {
                        option = groups[group].options[0].value;
                        batchStart[optionWheelIdx] = null;
                        batchEnd[optionWheelIdx] = null;
                        if (!change) {
                            groupChanged = true;
                            inst._tempWheelArray = [group, option];
                            s.readonly = [false, true];
                        }
                    } else {
                        s.readonly = origReadOnly;
                    }
                } else {
                    option = temp[optionWheelIdx];
                }

                if (!change && (i === undefined || i === groupWheelIdx)) {
                    genGroupWheel(s.wheels);
                    if (batchChanged[groupWheelIdx]) {
                        clearTimeout(timerGroup);
                        timerGroup = setTimeout(function () {
                            change = true;
                            batchStart[groupWheelIdx] = tempBatchStart[groupWheelIdx];
                            batchEnd[groupWheelIdx] = tempBatchEnd[groupWheelIdx];
                            inst.changeWheel([groupWheelIdx], undefined, true);
                        }, time ? time * 1000 : 100);
                        ret = true;
                    }
                }

                if (!change && (i === undefined || i === optionWheelIdx || groupChanged)) {
                    genOptWheel(s.wheels);
                    if (batchChanged[optionWheelIdx]) {
                        clearTimeout(timerOpt);
                        timerOpt = setTimeout(function () {
                            change = true;
                            batchStart[optionWheelIdx] = tempBatchStart[optionWheelIdx];
                            batchEnd[optionWheelIdx] = tempBatchEnd[optionWheelIdx];
                            inst.changeWheel([optionWheelIdx], undefined, true);
                            s.readonly = origReadOnly;
                            prevGroup = group;
                        }, time ? time * 1000 : 100);
                        ret = true;
                    }
                }

                if (ret) {
                    return false;
                }

                if (groupHdr) {
                    $('.dw-li[data-val^="__group"]', dw).addClass('dw-w-gr');
                }

                $.each(s.invalid, function (i, v) {
                    $('.dw-li[data-val="' + v + '"]', t).removeClass('dw-v');
                });

                change = false;
            },
            onClear: function (dw) {
                selectedValues = {};
                input.val('');
                $('.dwwl' + optionWheelIdx + ' .dw-li', dw).removeClass(selectedClass).removeAttr('aria-selected');
            },
            onCancel: function () {
                if (!inst.live && multiple) {
                    selectedValues = $.extend({}, origValues);
                }
            },
            onDestroy: function () {
                input.remove();
                elm.removeClass('dw-hsel').removeAttr('tabindex');
            }
        };
    };

})(jQuery);
