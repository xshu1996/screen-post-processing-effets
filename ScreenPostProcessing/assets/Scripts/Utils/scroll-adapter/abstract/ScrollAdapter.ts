import { ArrangeAxis, HolderEvent, Orientation, ViewEvent } from "../define/enum";
import { IElement } from "../define/interface";
import { Helper } from "../help/helper";
import { CenterManager } from "../manager/CenterManager";
import { LayoutManager } from "../manager/LayoutManager";
import { ModelManager } from "../manager/ModelManager";
import { PageViewManager } from "../manager/PageViewManager";
import { ReleaseManager } from "../manager/ReleaseManager";
import { ScrollManager } from "../manager/ScrollManager";
import { ViewManager } from "../manager/ViewManager";
import { Holder } from "./Holder";
import { View } from "./View";
// import { _decorator, Component, Node, Size, Prefab, Color, } from 'cc';
const { ccclass, property } = cc._decorator;
@ccclass
export abstract class ScrollAdapter<T = any> extends cc.Component {
    /**
     * 滚动管理器
     * 负责滚动的逻辑，类似于ScrollView
     */
    @property(ScrollManager) scrollManager: ScrollManager = new ScrollManager()
    /**
     * 视图管理器
     * 负责管理可视区域item的创建、回收、主轴方向布局等逻辑
     */
    @property(ViewManager) viewManager: ViewManager<T> = new ViewManager()
    /**
     * 布局管理器
     * 负责交叉轴方向的布局逻辑
     */
    @property(LayoutManager) layoutManager: LayoutManager = new LayoutManager()
    /**
     * 分页管理器
     * 负责处理分页逻辑
     */
    @property(PageViewManager) pageViewManager: PageViewManager = new PageViewManager()
    /**
     * 释放管理器
     * 负责处理4个方向的 ”拉“ ”释放“ 等逻辑
     */
    @property(ReleaseManager) releaseManager: ReleaseManager = new ReleaseManager()
    /**
     * 居中管理器
     * 除了负责自动居中以外，还负责通过索引计算滚动的具体位置
     */
    @property(CenterManager) centerManager: CenterManager = new CenterManager()
    /**
     * 数据管理器
     * 负责数据的增删改查，对用户数据进行二次封装
     */
    public modelManager: ModelManager<T> = new ModelManager()
    /**
     * 获取预制体
     * @param data 用户自定义数据
     * @return 返回一个预制体
     */
    public abstract getPrefab(data: T): cc.Node | cc.Prefab
    /** 
     * 初始化元素布局属性，子类可重写，默认为单列 
     * 例如你想实现表格布局，你可以通过设置 element.wrapAfterMode、element.wrapBeforeMode来控制
    */
    public initElement(element: IElement, data: T) { }
    /** 
     * 返回一个View实例
     * 子类可重写
     */
    public getView(): View<T> {
        return new DefaultView(this)
    }
    /** 
     * 返回一个Holder实例 
     * 子类可重写
     */
    public getHolder(node: cc.Node, code: string): Holder<T> {
        return new DefaultHolder(node, code, this)
    }
    /** 是否垂直滚动 */
    public get isVertical() {
        return this.scrollManager.orientation == Orientation.Vertical
    }
    /** 是否水平滚动 */
    public get isHorizontal() {
        return this.scrollManager.orientation == Orientation.Horizontal
    }
    /** 主轴排列方向 */
    public get isArrangeAxisStart() {
        return this.viewManager.arrangeAxis == ArrangeAxis.Start
    }
    /** 主轴方向 尺寸|坐标 key */
    public get mainAxis() {
        return this.isVertical ? "y" : "x"
    }
    /** 交叉轴方向 尺寸|坐标 key */
    public get crossAxis() {
        return this.isVertical ? "x" : "y"
    }
    /** 主轴方向锚点 */
    public get mainAxisAnchorPoint() {
        let point = this.isVertical ? 1 : 0
        return this.isArrangeAxisStart ? point : 1 - point
    }
    /** 主轴方向可视区域尺寸 */
    public get mainAxisSize() {
        return Helper.sizeToVec(this.scrollManager.view.getContentSize())[this.mainAxis]
    }
    /** 交叉轴方向可视区域尺寸 */
    public get crossAxisSize() {
        return Helper.sizeToVec(this.scrollManager.view.getContentSize())[this.crossAxis]
    }
    /** 根据滑动方向和排列方向决定的乘积 */
    public get multiplier() {
        var multiplier = this.isVertical ? -1 : 1
        return this.isArrangeAxisStart ? -multiplier : multiplier
    }
    /** 主轴方向 Header 的 padding */
    public get paddingHeader() {
        if (this.isHorizontal) {
            return this.isArrangeAxisStart ? this.viewManager.left : this.viewManager.right
        } else {
            return this.isArrangeAxisStart ? this.viewManager.top : this.viewManager.bottom
        }
    }
    /** 主轴方向 Footer 的 padding */
    public get paddingFooter() {
        if (this.isHorizontal) {
            return this.isArrangeAxisStart ? this.viewManager.right : this.viewManager.left
        } else {
            return this.isArrangeAxisStart ? this.viewManager.bottom : this.viewManager.top
        }
    }
    /** 主轴方向 padding 总和 */
    public get mainAxisPadding() {
        if (this.isHorizontal) {
            return this.viewManager.left + this.viewManager.right
        } else {
            return this.viewManager.top + this.viewManager.bottom
        }
    }
    /**
     * 从父节点中递归获取 ScrollAdapter
     * @param node 第一个获取ScrollAdapter的node
     * @return 返回父节点中第一个找到的 ScrollAdapter
     */
    public getParentAdapter(node: cc.Node) {
        if (node == null) return
        if (node instanceof cc.Scene) return
        var adapter = node.getComponent("ScrollAdapter")
        if (adapter) {
            return adapter
        }
        return this.getParentAdapter(node.parent)
    }

    protected __preload() {
        this.scrollManager.internal_create(this)
        this.viewManager.internal_create(this)
        this.modelManager.internal_create(this)
        this.releaseManager.internal_create(this)
        this.layoutManager.internal_create(this)
        this.pageViewManager.internal_create(this)
        this.centerManager.internal_create(this)

        this.viewManager.internal_init()
        this.releaseManager.internal_init()
        this.layoutManager.internal_init()
        this.pageViewManager.internal_init()
        this.centerManager.internal_init()
        this.scrollManager.internal_init()
        this.modelManager.internal_init()
    }

    protected update(deltaTime: number) {
        this.scrollManager.internal_lateUpdate(deltaTime)
        this.viewManager.internal_lateUpdate(deltaTime)
        this.layoutManager.internal_lateUpdate(deltaTime)
        this.releaseManager.internal_lateUpdate(deltaTime)
    }
}
/** 
 * 默认View 如有特殊需求可重写
 * 可在任何地方通过this.adapter.node 来监听对应的事件
 * 一个 view 可以理解为单行容器，每个view容器内可包含多个 holder（例如表格布局）
 * 每个 view 所包含的 holder 个数是由用户逻辑来确定的，可通过 IElement里的换行来进行动态设置
 */
export class DefaultView extends View {
    /** 当单行view显示时 */
    protected onVisible(): void {
        this.adapter.node.emit(ViewEvent.VISIBLE, this)
    }
    /** 当单行view隐藏时 */
    protected onDisable(): void {
        this.adapter.node.emit(ViewEvent.DISABLE, this)
    }
}
/** 
 * 默认Holder 如有特殊需求可重写 
 * 在item的自定义脚本中，可以通过this.node来监听对应的事件
*/
export class DefaultHolder extends Holder {
    protected onCreated(): void {
        this.node.emit(HolderEvent.CREATED, this)
    }
    protected onVisible(): void {
        this.node.emit(HolderEvent.VISIBLE, this)
    }
    protected onDisable(): void {
        this.node.emit(HolderEvent.DISABLE, this)
    }
}