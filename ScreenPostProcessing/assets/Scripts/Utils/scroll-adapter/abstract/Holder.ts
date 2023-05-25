import { IElement, IModel } from '../define/interface';
import { Helper } from '../help/helper';
import { ModelManager } from '../manager/ModelManager';
import { ScrollAdapter } from './ScrollAdapter';
import { View } from './View';
const { ccclass, property } = cc._decorator;
// @ccclass
export abstract class Holder<T = any, A extends ScrollAdapter = ScrollAdapter<T>> {
    protected abstract onCreated(): void
    protected abstract onVisible(): void
    protected abstract onDisable(): void
    private readonly _node: cc.Node
    public get node() { return this._node }
    private readonly _transform: cc.Node
    public get transform() { return this._transform }
    private readonly _code: string
    public get code() { return this._code }
    private readonly _adapter: A
    public get adapter() { return this._adapter }
    private _model: IModel<T>
    public get model() { return this._model }
    private _view: View<T, A>
    public get view() { return this._view }
    public get data(): T | null { return this._model && this._model.data }
    private _fixedIndex: number = -1
    public get fixedIndex() { return this._fixedIndex }
    private _oldData: T = null
    public get oldData() { return this._oldData }
    private _oldElement: IElement = null
    public get element() { return this._model && this._model.element }
    public get index() { return this._model && this._model.index }
    private _isCallCreated: boolean = false
    private _isLayout: boolean = false
    constructor(node: cc.Node, code: string, adapter: A) {
        this._node = node
        this._code = code
        this._adapter = adapter
        this._transform = node
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_visible(view: View<T, A>, model: IModel<T>, isNew: boolean) {
        this._view = view
        this._model = model
        this._oldElement = Object.assign({}, model.element)
        this._model.element.update = this._updateElement.bind(this)
        this._oldData = this.data
        if (!isNew) return
        this.node.active = true
        if (!this._isCallCreated) {
            this._isCallCreated = true
            this.onCreated()
        }
        if (this.element.fixed) {
            this._fixedIndex = this.view.group.models.findIndex(item => item.index == this.model.index)
        }
        this.transform.setContentSize(this.model.size.x, this.model.size.y)
        this.node.setScale(this.model.scale.x, this.model.scale.y)
        this._register()
        this.onVisible()
        this._model.update = this._updateHandler.bind(this)
    }
    private _updateElement() {
        if (this._oldElement.layer != this.element.layer) {
            this.node.parent = this.adapter.scrollManager.getLayerNode(this.element.layer)
            this._oldElement.layer = this.element.layer
        }
        if (this._oldElement.wrapAfterMode != this.element.wrapAfterMode ||
            this._oldElement.wrapBeforeMode != this.element.wrapBeforeMode ||
            this._oldElement.ignoreLayout != this.element.ignoreLayout ||
            this.element.ignoreLayout && this._oldElement.placeholder != this.element.placeholder) {
            this.adapter.viewManager.internal_updateVisibleView(this.model.index)
            this._oldElement.wrapAfterMode = this.element.wrapAfterMode
            this._oldElement.wrapBeforeMode = this.element.wrapBeforeMode
            this._oldElement.ignoreLayout = this.element.ignoreLayout
            this._oldElement.placeholder = this.element.placeholder
        }
    }
    private _updateHandler() {
        this._model.update = () => { }
        this.onVisible()
        this._model.update = this._updateHandler.bind(this)
    }

    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_disable() {
        this.adapter.scrollManager.internal_disableTouchTarget(this.node)
        this.onDisable()
        this._unregister()
        this._model.update = () => { }
        this._model.element.update = () => { }
        this._view = null
        this._model = null
        this._fixedIndex = -1
        this._isLayout = false
        this._oldData = null
        this.node.active = false
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_layout() {
        var size = { x: this.model.size.x, y: this.model.size.y }
        if (this.adapter.layoutManager.isControlMainAxisSize) {
            size[this.adapter.mainAxis] = this.model.layoutSize[this.adapter.mainAxis]
        }
        if (this.adapter.layoutManager.isControlCrossAxisSize) {
            size[this.adapter.crossAxis] = this.model.layoutSize[this.adapter.crossAxis]
        }

        this._isLayout = true
        this.transform.setContentSize(size.x, size.y)
        this._isLayout = false
        this.node.setPosition(this.model.position.x, this.model.position.y)
    }
    private _register() {
        this.node.on(cc.Node.EventType.SIZE_CHANGED, this._onSizeChanged, this)
        this.node.on(cc.Node.EventType.SCALE_CHANGED, this._onScaleChanged, this)
        this.node.on(cc.Node.EventType.ANCHOR_CHANGED, this._onAnchorPointChanged, this)
        this._adapter.modelManager.on(ModelManager.Event.ON_UPDATE, this._updateHandler, this)
    }
    private _unregister() {
        this.node.off(cc.Node.EventType.SIZE_CHANGED, this._onSizeChanged, this)
        this.node.off(cc.Node.EventType.SCALE_CHANGED, this._onScaleChanged, this)
        this.node.off(cc.Node.EventType.ANCHOR_CHANGED, this._onAnchorPointChanged, this)
        this._adapter.modelManager.off(ModelManager.Event.ON_UPDATE, this._updateHandler, this)
    }
    private _onSizeChanged() {
        if (this._isLayout) return
        var isMainAxisEqual = Helper.approximately(this.model.size[this.adapter.mainAxis], Helper.sizeToVec(this.transform.getContentSize())[this.adapter.mainAxis])
        var isCrossAxisEqual = Helper.approximately(this.model.size[this.adapter.crossAxis], Helper.sizeToVec(this.transform.getContentSize())[this.adapter.crossAxis])
        this.model.size.x = this.transform.width
        this.model.size.y = this.transform.height
        if (isMainAxisEqual && isCrossAxisEqual) {
            return
        }
        this.view.internal_holderChanged(isMainAxisEqual)
    }
    private _onScaleChanged(type: any) {
        // if (type != Node.TransformBit.SCALE) return
        // 如果未勾选缩放控制 则不关心缩放变化
        if (!this.adapter.layoutManager.controlScaleWidth && !this.adapter.layoutManager.controlScaleHeight) {
            return
        }
        var isMainAxisEqual = Helper.approximately(this.model.scale[this.adapter.mainAxis], this.node.scale[this.adapter.mainAxis])
        var isCrossAxisEqual = Helper.approximately(this.model.scale[this.adapter.crossAxis], this.node.scale[this.adapter.crossAxis])
        this.model.scale.x = this.node.scaleX
        this.model.scale.y = this.node.scaleY
        if (isMainAxisEqual && isCrossAxisEqual) {
            return
        }
        this.view.internal_holderChanged(isMainAxisEqual)
    }
    private _onAnchorPointChanged() {
        var isMainAxisEqual = Helper.approximately(this.model.anchorPoint[this.adapter.mainAxis], this.transform.getAnchorPoint()[this.adapter.mainAxis])
        var isCrossAxisEqual = Helper.approximately(this.model.anchorPoint[this.adapter.crossAxis], this.transform.getAnchorPoint()[this.adapter.crossAxis])
        this.model.anchorPoint.x = this.transform.anchorX
        this.model.anchorPoint.y = this.transform.anchorY
        if (isMainAxisEqual && isCrossAxisEqual) {
            return
        }
        this.view.internal_holderChanged(isMainAxisEqual)
    }
}

