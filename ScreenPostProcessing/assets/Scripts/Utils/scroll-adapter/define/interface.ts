import { Layer, WrapMode } from "./enum"
export interface ILike {
    x: number
    y: number
}
export interface IModel<T> {
    /** 用户自定义数据，可以自由修改，修改后调用 update来更新当前数据(如果当前数据在可视范围内) */
    data: T
    /** 布局元素 */
    element: IElement
    /** 更新当前数据 */
    update: () => void
    // 以下内容不需要用户修改
    /** model索引 用户不能修改 */
    index: number
    /** 数据特征码  */
    code: string
    /** 数据尺寸，用户不能修改*/
    size: ILike
    /** 布局用的虚拟尺寸，用户不能修改 */
    layoutSize: ILike
    /** 数据缩放，用户不能修改*/
    scale: ILike
    /** 布局用的虚拟坐标，用户不能修改 */
    position: ILike
    /** 数据锚点，用户不能修改 */
    anchorPoint: ILike
}
export interface IElement {
    /**
    * 前换行，当前元素相对于前一个元素的换行模式，默认值 Wrap
    */
    wrapBeforeMode: WrapMode
    /**
     * 后换行，下一个元素相对于自己的换行模式，默认值 Nowrap
     */
    wrapAfterMode: WrapMode
    /**
     * 忽略布局，使其不受Layout控制
     */
    ignoreLayout: boolean
    /**
     * 仅 ignoreLayout = true 时有效，
     * 作用：当忽略布局时是否保留其位置，如果为true则会保留
     * 默认为 false 当 ignoreLayout = true 时其位置会被后面的元素填满
     */
    placeholder: boolean
    /**
     * 最小尺寸，如果同时设置了preferredSize则取最大值（只会影响滑动反方向）
     */
    minSize: ILike
    /**
     * 首选尺寸，如果同时设置了minSize则取最大值（只会影响滑动反方向）
     */
    preferredSize: ILike
    /**
     * flex,和CSS flex一样的作用（只会影响滑动反方向）
     */
    flexibleSize: ILike
    /** 
     * 指定当前数据的层级，如果未设置，使用最低层 Lowest
     */
    layer: Layer
    /**
     * 固定到顶部
     */
    fixed: boolean
    /**
     * 开启fixed时有效，固定时顶部的偏移量
     */
    fixedOffset: number
    /**
     * 开启fixed时有效，与下一个设置了fixed的item的间距
     */
    fixedSpacing: number
    update: () => void
}