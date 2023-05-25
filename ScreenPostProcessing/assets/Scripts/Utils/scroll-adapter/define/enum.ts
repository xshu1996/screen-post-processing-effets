// import { Enum } from "cc";

export enum Orientation {
    Vertical,
    Horizontal
}
export enum MovementType {
    Unrestricted,
    Elastic,
    Clamped
}
export enum ArrangeAxis {
    Start,
    End
}
export enum StretchDirection {
    Auto,
    Header,
    Footer,
    Center,
}
export enum Layer {
    Lowest,
    Medium,
    Highest
}
export enum WrapMode {
    Auto,
    Wrap,
    Nowrap
}
export enum TouchMode {
    /** 当内容未填满时 并且未开启PullRelease 并且 未开启Center 功能是不可滑动 */
    Auto,
    /** 永远可以滑动，无论是否有内容 */
    AlwaysAllow,
    /** 禁用滑动 */
    Disabled
}
export enum MagneticDirection {
    Header, Footer
}
export enum ChildAlignment {
    UpperLeft,
    UpperCenter,
    UpperRight,
    MiddleLeft,
    MiddleCenter,
    MiddleRight,
    LowerLeft,
    LowerCenter,
    LowerRight
}
export enum ScrollDirection {
    Up,
    Down,
    Left,
    Right,
    None
}
export enum ScrollbarDirection {
    Top_To_Bottom,
    Bottom_To_Top,
    Left_To_Right,
    Right_To_Left,
}
export enum NestedDirection {
    Both,
    Header,
    Footer
}
export enum AlwaysScroll {
    Auto,
    Header,
    Footer
}
export enum IndicatorMode {
    Normal,
    Button
}
export enum Transition {
    None,
    ColorTint,
    SpriteSwap,
    Scale,
}
export enum ReleaseState {
    IDLE = 'IDLE',
    PULL = 'PULL',
    WAIT = 'WAIT',
    RELEASE = "RELEASE",
}
export enum HolderEvent {
    CREATED = "ADAPTER:HOLDER:CREATED",
    VISIBLE = "ADAPTER:HOLDER:VISIBLE",
    DISABLE = "ADAPTER:HOLDER:DISABLE",
}
export enum ViewEvent {
    VISIBLE = "ADAPTER:VIEW:VISIBLE",
    DISABLE = "ADAPTER::VIEW:DISABLE",
}
cc.Enum(Orientation)
cc.Enum(MovementType)
cc.Enum(ArrangeAxis)
cc.Enum(StretchDirection)
cc.Enum(MagneticDirection)
cc.Enum(ScrollbarDirection)
cc.Enum(ChildAlignment)
cc.Enum(TouchMode)
cc.Enum(IndicatorMode)
cc.Enum(Transition)
