import mobiscroll from '../core/dom';
import { $, extend, 
    MbscCoreOptions, 
    MbscFrameOptions,
    MbscScrollerOptions,
    MbscDataControlOptions } from '../core/core';

import {
    Directive,
    Component,
    Input,
    Output,
    EventEmitter,
    Optional,
    AfterViewInit,
    OnDestroy,
    OnInit,
    OnChanges,
    SimpleChanges,
    ElementRef,
    ViewChild,
    ViewChildren,
    NgZone,
    NgModule,
    Injectable,
    ContentChildren,
    QueryList
} from '@angular/core';

// // angular2 import { trigger, state, animate, transition, style } from '@angular/core'; // Angular 2.x
// // angular2 /*
// import { trigger, state, animate, transition, style } from '@angular/animations'; // Angular 4.x
// // angular2 */

import { CommonModule } from '@angular/common';

import {
    NgControl,
    ControlValueAccessor,
    FormsModule
} from '@angular/forms';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { MbscFormValueBase } from '../forms.angular';

@Injectable()
export class MbscInputService {
    private _controlSet: boolean = false;
    get isControlSet(): boolean {
        return this._controlSet;
    }
    set isControlSet(v: boolean) {
        this._controlSet = v;
    }

    private _componentRef: MbscFormValueBase = undefined;
    get input(): MbscFormValueBase {
        return this._componentRef;
    }
    set input(v: MbscFormValueBase) {
        this._componentRef = v;
    }
}

@Injectable()
export class MbscListService {
    private addRemoveSubject: Subject<any> = new Subject();

    notifyAddRemove(item: any) {
        this.addRemoveSubject.next(item);
    }

    onAddRemove(): Observable<any> {
        return this.addRemoveSubject.asObservable();
    }
}

class MbscBase implements AfterViewInit, OnDestroy {
    /**
     * The mobiscroll settings for the directive are passed through this input.
     */
    @Input('mbsc-options')
    options: MbscCoreOptions = {};
    @Input()
    theme: string;
    @Input()
    lang: string;
    @Input()
    rtl: boolean;
    @Input()
    onInit: (event: any, inst: any) => void;
    @Input()
    onDestroy: (event:any, inst: any) => void;

    inlineOptions(): MbscCoreOptions {
        return {
            theme: this.theme,
            lang: this.lang,
            rtl: this.rtl,
            onInit: this.onInit,
            onDestroy: this.onDestroy
        };
    }

    /**
     * Used to add theme classes to the host on components - the mbsc-input components need to have a wrapper
     * with that css classes for the style to work
     */
    setThemeClasses() {
        var themeClass = 'mbsc-control-ng mbsc-' + this._instance.settings.theme + (this._instance.settings._baseTheme ? ' mbsc-' + this._instance.settings._baseTheme : '');
        $(this.initialElem.nativeElement).addClass(themeClass);
    }

    /**
     * Reference to the initialized mobiscroll instance
     * For internal use only
     */
    _instance: any = null;

    /**
     * Reference to the html element the mobiscroll is initialized on. 
     */
    element: any = null;

    /**
     * Public getter for the mobiscroll instance
     */
    get instance(): any {
        return this._instance;
    }

    /**
     * Sets the element, the mobiscroll should be initialized on
     * The initialElement is set if an input is not found inside of it.
     * NOTE: Should be called after the view was initialized!
     */
    protected setElement() {
        this.element = this.initialElem.nativeElement;
        let contentInput: any = $('input', this.initialElem.nativeElement);
        if (contentInput.length) {
            this.element = contentInput[0];
        }
    }

    constructor(protected initialElem: ElementRef) { }

    /* AfterViewInit Interface */

    /**
     * Called after the view is initialized.
     * All the elements are in the DOM and ready for the initialization of the mobiscroll.
     */
    ngAfterViewInit() {
        this.setElement();
    }


    /* OnDestroy Interface */

    ngOnDestroy() {
        if (this._instance) {
            this._instance.destroy();
        }
    }
}

abstract class MbscValueBase extends MbscBase {
    /**
     * This method is called when the model changes, and the new value should propagate
     * to mobiscroll instance.
     * Should be implemented by the decendant classes
     * @param v The new value to be set
     */
    abstract setNewValue(v: any): void;

    /**
     * Constructor for the base mobiscroll control
     * @param initialElem Reference to the initial element the directive is put on
     * @param zone Reference to the NgZone service
     */
    constructor(initialElem: ElementRef, protected zone: NgZone) {
        super(initialElem);
    }

    /**
     * Used to store the initial value of the model, until the mobiscroll instance is ready to take it
     */
    protected initialValue: any = undefined;

    /**
     * Saves the initial value when the instance is not ready yet.
     * In some cases the initial value is set when there is no view yet. 
     * This proxy function saves the initial value and calls the appropriate setNewValue.
     * NOTE: after the instance is created, a setVal should be called to set the initial value to the instance 
     * @param v The new value to set (it comes from the model)
     */
    protected setNewValueProxy(v: any) {
        if (!this._instance) {
            this.initialValue = v;
        }
        this.setNewValue(v);
    }
}

abstract class MbscControlBase extends MbscValueBase implements ControlValueAccessor {
    /**
     * Returns an object containing the extensions of the option object 
     */
    get optionExtensions(): any {
        let externalOnClose = this.options && (this.options as any).onClose;
        let externalOnFill = this.options && (this.options as any).onFill;

        return {
            onFill: (event: any, inst: any) => {
                // call the oldAccessor writeValue if it was overwritten
                if (this.oldAccessor) {
                    this.oldAccessor.writeValue(event.valueText);
                }
                if (externalOnFill) {
                    externalOnFill(event, inst);
                }
            },
            onClose: (event: any, inst: any) => {
                // Call the onTouch function when the scroller closes - sets the form control touched
                this.onTouch();
                if (externalOnClose) {
                    externalOnClose(event, inst);
                }
            }
        }
    }

    _needsTimeout: boolean = true;
    /**
     * This function propagates the value to the model
     * It's overwrittem in registerOnChange (if formControl is used)
     */
    onChange: any = () => { };

    /**
     * This function has to be called when the control is touched, to notify the validators (if formControl is used)
     * It's overwritter in registerOnTouched
     */
    onTouch: any = () => { };

    /**
     * EventEmitter for the value change
     * Used only without FormControl
     */
    onChangeEmitter: EventEmitter<any> = new EventEmitter<any>();

    /**
     * Registers the change event handler on the element
     * Patches the FormControl value or emits the change emitter depending on
     * whether the FormControl is used or not
     */
    protected handleChange(element?: any): void {
        let that = this;
        $(element || this.element).on('change', function () {
            that.zone.run(function () {
                let value = that._instance.getVal();
                if (that.control) {
                    that.onChange(value);
                    that.control.control.patchValue(value);
                } else {
                    that.onChangeEmitter.emit(value);
                }
            })
        });
    }

    protected oldAccessor: any;

    /**
     * Constructs the Base Control for value changes
     * @param initialElement Reference to the initial element the directive is used on
     * @param zone Reference to the NgZone service
     * @param control Reference to the FormControl if used (ngModel or formControl)
     */
    constructor(initialElement: ElementRef, zone: NgZone, protected control: NgControl, public _inputService: MbscInputService) {
        super(initialElement, zone);

        this.overwriteAccessor();

        if (_inputService) {
            _inputService.isControlSet = true;
        }
    }

    overwriteAccessor() {
        if (this.control) {
            if (this.control.valueAccessor !== this) {
                this.oldAccessor = this.control.valueAccessor;
            }
            this.control.valueAccessor = this;
        }
    }

    ngAfterViewInit() {
        super.ngAfterViewInit();

        this.handleChange();

        this.overwriteAccessor();

        // Register the control again to overwrite onTouch and onChange
        if (this.control && (this.control as any)._setUpControl) {
            (this.control as any)._setUpControl();
        }
    }


    /* ControlValueAccessor Interface */

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouch = fn;
    }

    /**
     * Called when the model changed
     * @param v the new value of the model
     */
    writeValue(v: any): void {
        if (this._needsTimeout) {
            setTimeout(() => {
                this.setNewValueProxy(v);
            });
        } else {
            this.setNewValueProxy(v);
        }
    }
}
abstract class MbscDataControlMixin implements OnInit {
    /**
     * The mobiscroll settings for the directive are passed through this input.
     */
    @Input('mbsc-options')
    public options: MbscCoreOptions & MbscDataControlOptions = {};

    /**
     * True if multiselection is on
     */
    public isMulti: boolean = undefined;

    /**
     * Array required for data checks
     * Holds the previous data array against the check is made
     */
    public previousData: Array<any> = undefined;

    /**
     * Disables array checking in DoCheck for the data array
     */
    @Input('mbsc-no-data-check')
    noDataCheck: boolean = false;

    /**
     * Array for the data
     */
    @Input('mbsc-data')
    data: Array<any> = undefined;

    _instance: any;
    _inputService: any;

    /**
     * If the new value differs from the current value
     * sets the new value to the instance and writes it to the input
     * @param v The new value to be set
     */
    setNewValue(v: any) {
        if (this._instance) {
            let changed: boolean;
            if (this.isMulti) {
                changed = !deepEqualsArray(v, this._instance.getVal());
            }
            else {
                let innerValue: any = this._instance.getVal();
                changed = innerValue !== v;
            }

            // set value to instance if differs from the model
            if (changed) {
                this._instance.setVal(v, true, false);
                if (this._inputService && this._inputService.input) {
                    this._inputService.input.innerValue = this._instance._value;
                }
            }
        }
    }

    /**
     * Creates a one level copy of the data array to the previousData array
     */
    cloneData() {
        this.previousData = this.data ? [] : this.data;
        if (this.data) {
            for (let i = 0; i < this.data.length; i++) {
                this.previousData.push(this.data[i]);
            }
        }
    }

    /* OnInit Interface */

    /**
     * Runs after the input parameters are settled and before the mobiscroll control is initialized
     */
    ngOnInit() {
        this.isMulti = this.options && this.options.select && this.options.select !== 'single';
    }

    abstract refreshData(newData: any): void;

    /**
     * Runs on every change
     */
    ngDoCheck() {
        if (this._instance && this.data !== undefined && !this.noDataCheck && !deepEqualsArray(this.data, this.previousData)) {
            this.cloneData();
            this.refreshData(this.data);
        }
    }
}
abstract class MbscDataControlBase extends MbscControlBase implements OnInit {
    /**
     * The mobiscroll settings for the directive are passed through this input.
     */
    @Input('mbsc-options')
    public options: MbscCoreOptions & MbscDataControlOptions = {};

    /**
     * True if multiselection is on
     */
    protected isMulti: boolean = undefined;

    /**
     * Array required for data checks
     * Holds the previous data array against the check is made
     */
    private previousData: Array<any> = undefined;

    /**
     * Disables array checking in DoCheck for the data array
     */
    @Input('mbsc-no-data-check')
    noDataCheck: boolean = false;

    /**
     * Array for the data
     */
    @Input('mbsc-data')
    data: Array<any> = undefined;

    constructor(initialElem: ElementRef, zone: NgZone, control: NgControl, inputService: MbscInputService) {
        super(initialElem, zone, control, inputService);
    }

    /**
     * If the new value differs from the current value
     * sets the new value to the instance and writes it to the input
     * @param v The new value to be set
     */
    setNewValue(v: any) {
        if (this._instance) {
            let changed: boolean;
            if (this.isMulti) {
                changed = !deepEqualsArray(v, this._instance.getVal());
            }
            else {
                let innerValue: any = this._instance.getVal();
                changed = innerValue !== v;
            }

            // set value to instance if differs from the model
            if (changed) {
                this._instance.setVal(v, true, false);
                if (this._inputService && this._inputService.input) {
                    this._inputService.input.innerValue = this._instance._value;
                }
            }
        }
    }

    /**
     * Creates a one level copy of the data array to the previousData array
     */
    cloneData() {
        this.previousData = this.data ? [] : this.data;
        if (this.data) {
            for (let i = 0; i < this.data.length; i++) {
                this.previousData.push(this.data[i]);
            }
        }
    }

    /* OnInit Interface */

    /**
     * Runs after the input parameters are settled and before the mobiscroll control is initialized
     */
    ngOnInit() {
        this.isMulti = this.options && this.options.select && this.options.select !== 'single';
    }

    abstract refreshData(newData: any): void;

    /**
     * Runs on every change
     */
    ngDoCheck() {
        if (this._instance && this.data !== undefined && !this.noDataCheck && !deepEqualsArray(this.data, this.previousData)) {
            this.cloneData();
            this.refreshData(this.data);
        }
    }
}

abstract class MbscFrameBase extends MbscControlBase {
    @Input()
    options: MbscFrameOptions;

    @Input()
    anchor: string | HTMLElement;
    @Input()
    animate: boolean | 'fade' | 'flip' | 'pop' | 'swing' | 'slidevertical' | 'slidehorizontal' | 'slidedown' | 'slideup';
    @Input()
    buttons: Array<any>;
    @Input()
    closeOnOverlayTap: boolean;
    @Input()
    context: string | HTMLElement;
    @Input()
    disabled: boolean;
    @Input()
    display: 'top' | 'bottom' | 'bubble' | 'inline' | 'center';
    @Input()
    focusOnClose: boolean | string | HTMLElement;
    @Input()
    focusTrap: boolean;
    @Input()
    headerText: string | boolean | ((formattedValue: string) => string);
    @Input()
    showOnFocus: boolean;
    @Input()
    showOnTap: boolean;
    @Input()
    onBeforeClose: (event: { valueText: string, button: string }, inst: any) => void;
    @Input()
    onBeforeShow: (event: any, inst: any) => void;
    @Input()
    onCancel: (event: { valuteText: string }, inst: any) => void;
    @Input()
    onClose: (event: { valueText: string }, inst: any) => void;
    @Input()
    onDestroy: (event: any, inst: any) => void;
    @Input()
    onFill: (event: any, inst: any) => void;
    @Input()
    onMarkupReady: (event: { target: HTMLElement }, inst: any) => void;
    @Input()
    onPosition: (event: { target: HTMLElement, windowWidth: number, windowHeight: number }, inst: any) => void;
    @Input()
    onShow: (event: { target: HTMLElement, valueText: string }, inst: any) => void;

    inlineOptions(): MbscFrameOptions {
        return extend(super.inlineOptions(), {
            anchor: this.anchor,
            animate: this.animate,
            buttons: this.buttons,
            closeOnOverlayTap: this.closeOnOverlayTap,
            context: this.context,
            disabled: this.disabled,
            display: this.display,
            focusOnClose: this.focusOnClose,
            focusTrap: this.focusTrap,
            headerText: this.headerText,
            showOnFocus: this.showOnFocus,
            showOnTap: this.showOnTap,
            onBeforeClose: this.onBeforeClose,
            onBeforeShow: this.onBeforeShow,
            onCancel: this.onCancel,
            onClose: this.onClose,
            onDestroy: this.onDestroy,
            onFill: this.onFill,
            onMarkupReady: this.onMarkupReady,
            onPosition: this.onPosition,
            onShow: this.onShow
        });
    }

    get inline(): boolean {
        return (this.display || this.options.display) === 'inline';
    }

    constructor(initialElem: ElementRef, zone: NgZone, control: NgControl, _inputService: MbscInputService) {
        super(initialElem, zone, control, _inputService);
    }
}

abstract class MbscScrollerBase extends MbscFrameBase {
    // settings
    @Input()
    circular: boolean | Array<boolean>;
    @Input()
    height: number;
    @Input()
    layout: 'liquid' | 'fixed';
    @Input()
    maxWidth: number | Array<number>;
    @Input()
    minWidth: number | Array<number>;
    @Input()
    multiline: number;
    @Input()
    readOnly: boolean | Array<boolean>;
    @Input()
    rows: number;
    @Input()
    showLabel: boolean;
    @Input()
    showScrollArrows: boolean;
    @Input()
    wheels: Array<any>;
    @Input()
    width: number;
    // localization settings
    @Input()
    cancelText: string;
    @Input()
    clearText: string;
    @Input()
    selectedText: string;
    @Input()
    setText: string;
    // event callbacks
    @Input('onChange')
    onWheelChange: (event: { valueText?: string }, inst: any) => void;
    @Input()
    validate: (data: { values: Array<any>, index: number, direction: number }, inst: any) => (void | { disabled?: Array<any>, valid?: Array<any> });
    @Input()
    onSet: (event: { valueText?: string }, inst: any) => void;
    @Input()
    onItemTap: (event: any, inst: any) => void;
    @Input()
    onClear: (event: any, inst: any) => void;

    inlineOptions() : MbscScrollerOptions {
        return extend(super.inlineOptions(), {
            circular: this.circular,
            height: this.height,
            layout: this.layout,
            maxWidth: this.maxWidth,
            minWidth: this.minWidth,
            multiline: this.multiline,
            readOnly: this.readOnly,
            rows: this.rows,
            showLabel: this.showLabel,
            showScrollArrows: this.showScrollArrows,
            wheels: this.wheels,
            width: this.width,
            cancelText: this.cancelText,
            clearText: this.clearText,
            selectedText: this.selectedText,
            setText: this.setText,
            onChange: this.onWheelChange,
            validate: this.validate,
            onSet: this.onSet,
            onItemTap: this.onItemTap,
            onClear: this.onClear,
        });
    }

    constructor(initialElement: ElementRef, zone: NgZone, control: NgControl, _inputService: MbscInputService) {
        super(initialElement, zone, control, _inputService);
    }
}

function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            if (name !== 'constructor') {
                derivedCtor.prototype[name] = baseCtor.prototype[name];
            }
        });
    });
}

function deepEqualsArray(a1: Array<any>, a2: Array<any>): boolean {
    if (a1 === a2) {
        return true;
    } else if (!a1 || !a2 || a1.length !== a2.length) {
        return false;
    } else {
        for (let i = 0; i < a1.length; i++) {
            if (a1[i] !== a2[i]) {
                return false;
            }
        }
        return true;
    }
}

const INPUT_TEMPLATE = `<div *ngIf="inline"></div><mbsc-input *ngIf="!inline" [controlNg]="false" [name]="name" [theme]="theme" [disabled]="disabled" [error]="error" [errorMessage]="errorMessage" [icon]="inputIcon" [icon-align]="iconAlign"><ng-content></ng-content></mbsc-input>`;
export {
    $,
    extend,
    mobiscroll,

    MbscBase,
    MbscValueBase,
    MbscControlBase,
    MbscDataControlBase,
    MbscFrameBase,
    MbscScrollerBase,
    MbscDataControlMixin,

    applyMixins,
    deepEqualsArray,

    INPUT_TEMPLATE,

    Directive,
    Component,
    Input,
    Output,
    EventEmitter,
    Optional,
    AfterViewInit,
    OnDestroy,
    OnInit,
    OnChanges,
    SimpleChanges,
    ElementRef,
    ViewChild,
    ViewChildren,
    ContentChildren,
    QueryList,
    NgZone,
    NgControl,
    ControlValueAccessor,
    FormsModule,
    NgModule,
    CommonModule,
    Injectable,
    Observable,
    Subject//,
    //trigger, state, animate, transition, style
}