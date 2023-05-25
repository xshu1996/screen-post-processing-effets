import { Layer, StretchDirection, WrapMode } from "../define/enum";
import { IModel, ILike } from "../define/interface";
import { ScrollAdapter } from "./ScrollAdapter";
import { View } from "./View";
export class Group<T, A extends ScrollAdapter<T> = ScrollAdapter<T>>{
    private _adapter: A
    public get adapter() { return this._adapter }
    private _index: number = -1
    public get index() { return this._index }
    private _models: IModel<T>[] = []
    public get models() { return this._models }
    private _size: ILike = { x: 0, y: 0 }
    public get size() { return this._size }
    private _oldSize: ILike = { x: 0, y: 0 }
    public get oldSize() { return this._oldSize }
    private _anchorPoint: ILike = { x: 0.5, y: 0.5 }
    public get anchorPoint() { return this._anchorPoint }
    private _position: ILike = { x: 0, y: 0 }
    public get position() { return this._position }
    private _oldPosition: ILike = { x: 0, y: 0 }
    public get oldPosition() { return this._oldPosition }
    private _totalMinSize: ILike = { x: 0, y: 0 }
    public get totalMinSize() { return this._totalMinSize }
    private _totalPreferredSize: ILike = { x: 0, y: 0 }
    public get totalPreferredSize() { return this._totalPreferredSize }
    private _totalFlexibleSize: ILike = { x: 0, y: 0 }
    public get totalFlexibleSize() { return this._totalFlexibleSize }
    private _isFixed: boolean = false
    public get isFixed() { return this._isFixed }
    private _fixedIndex: number = -1
    public get fixedIndex() { return this._fixedIndex }
    constructor(adapter: A) {
        this._adapter = adapter
        this.internal_reset()
    }
    public findModelIndex(modelIndex: number) {
        return this.models.findIndex(item => item.index == modelIndex)
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_reset() {
        this._models = []
        this._size = { x: 0, y: 0 }
        this._oldSize = { x: 0, y: 0 }
        this._anchorPoint = { x: 0.5, y: 0.5 }
        this._position = { x: 0, y: 0 }
        this._oldPosition = { x: 0, y: 0 }
        this._totalMinSize = { x: 0, y: 0 }
        this._totalPreferredSize = { x: 0, y: 0 }
        this._totalFlexibleSize = { x: 0, y: 0 }
        this._isFixed = false
        this._fixedIndex = -1
        this._setAnchorPoint()
    }

    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_setPosition(position: number) {
        var mainAxis = this.adapter.mainAxis
        this.oldPosition[mainAxis] = this.position[mainAxis]
        this.position[mainAxis] = position
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_setIndex(index: number) {
        this._index = index
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_insert(options: { modelIndex: number, fixedIndex: number }, view: View, clear: boolean) {
        view.internal_reset()
        var caches = this.models
        this.internal_reset()
        this._fixedIndex = options.fixedIndex
        if (!clear) {
            for (let i = 0; i < caches.length; i++) {
                const model = caches[i];
                if (model.index < options.modelIndex) {
                    let ok = this._insertHandler(model, view)
                    if (!ok) {
                        options.modelIndex = model.index
                        options.fixedIndex = this.isFixed ? this.index : options.fixedIndex
                        return true
                    }
                } else {
                    break
                }
            }
        }
        for (let i = options.modelIndex; i < this.adapter.modelManager.length; i++) {
            const model = this.adapter.modelManager.get(i)
            let ok = this._insertHandler(model, view)
            if (!ok) {
                options.modelIndex = model.index
                options.fixedIndex = this.isFixed ? this.index : options.fixedIndex
                return model.index
            }
        }
        return false
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_includes(dataList: T[]) {
        for (let i = 0; i < dataList.length; i++) {
            const data = dataList[i];
            var index = this.models.findIndex(item => item.data == data)
            if (-1 != index) return true
        }
        return false
    }
    private _insertHandler(model: IModel<T>, view: View) {
        var wrap = view.internal_isWrap(model, this)
        if (wrap) {
            view.internal_reset()
            return false
        }
        view.internal_push(model)
        if (model.element.fixed) {
            this._isFixed = true
            this._fixedIndex = -1
        }
        var mainAxis = this.adapter.mainAxis
        var crossAxis = this.adapter.crossAxis
        if (!model.element.ignoreLayout || model.element.ignoreLayout && model.element.placeholder) {
            this.size[mainAxis] = Math.max(this.size[mainAxis], model.size[mainAxis] * model.scale[mainAxis])
        }
        this.size[crossAxis] = this.adapter.crossAxisSize
        this.oldSize[mainAxis] = this.size[mainAxis]
        this.oldSize[crossAxis] = this.size[crossAxis]
        this.models.push(model)
        return true
    }
    private _setAnchorPoint() {
        switch (this.adapter.viewManager.stretchDirection) {
            case StretchDirection.Center:
                this.anchorPoint[this.adapter.mainAxis] = 0.5
                break
            case StretchDirection.Header:
                this.anchorPoint[this.adapter.mainAxis] = 1 - this.adapter.mainAxisAnchorPoint
                break
            default:
                this.anchorPoint[this.adapter.mainAxis] = this.adapter.mainAxisAnchorPoint
                break
        }
    }
}