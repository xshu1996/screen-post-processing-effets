export class DoublyListNode<T>
{
    static readonly POOL: DoublyListNode<any>[] = [];
    static create<T>(key: string, val: T): DoublyListNode<T>
    {
        let dbNode = DoublyListNode.POOL.pop();
        if (!dbNode)
        {
            dbNode = new DoublyListNode<T>("", null);
        }
        dbNode.setKey(key);
        dbNode.setVal(val);
        return dbNode;
    }

    key: string = "";
    val: T = null;
    prev: DoublyListNode<T> = null;
    next: DoublyListNode<T> = null;

    constructor(key: string, val: T)
    {
        this.key = key;
        this.val = val;
    }

    public setKey(key: string): void
    {
        this.key = key;
    }

    public setVal(val: T): void
    {
        this.val = val;
    }

    public clear(destroy: boolean = false): void
    {
        this.prev = null;
        this.next = null;
        if (destroy)
        {
            this.val = null;
            this.key = "";
            DoublyListNode.POOL.push(this);
        }
    }
}

export interface LRU<T>
{
    get(key: string): T | null;
    put(key: string, val: T): void;
}

/**
 * @class LURCache
 * LRU 是 Least Recently Used 的缩写，即最近最少使用，选择最近最久未使用的页面予以淘汰。
 * @author xshu
 * 测试用例：https://leetcode-cn.com/problems/lru-cache/
 */
export class LRUCache<T> implements LRU<T>
{
    /** 默认容积 */
    private static DEFAULT_CAPACITY: number = 8;
    private _map: Map<string, DoublyListNode<T>>;
    private _capacity: number;
    /** 哨兵头节点 */
    private _dummyHead: DoublyListNode<T>;
    /** 哨兵尾节点 */
    private _dummyTail: DoublyListNode<T>;
    private _size: number;

    constructor(capacity: number = LRUCache.DEFAULT_CAPACITY)
    {
        this._capacity = capacity;
        this._map = new Map();
        this._size = 0;

        this._dummyHead = DoublyListNode.create("DummyHead", null);
        this._dummyTail = DoublyListNode.create("DummyTail", null);
        this._dummyHead.next = this._dummyTail;
        this._dummyTail.prev = this._dummyHead;        
    }

    public getCapacity(): number
    {
        return this._capacity;
    }

    public get(key: string): T | null
    {
        if (!this._map.has(key))
        {
            return null;
        }

        let node: DoublyListNode<T> = this._map.get(key);
        this.makeLeastRecently(node);
        return this._map.get(key).val;
    }

    public put(key: string, val: T): void
    {
        if (this._map.has(key))
        {
            let node: DoublyListNode<T> = this._map.get(key);
            node.setVal(val);
            this.makeLeastRecently(node);
            return;
        }
        // 如果容量到达上限，删除最近最少使用
        if (this._size >= this._capacity)
        {
            this.removeLeastRecently();
        }

        let newNode: DoublyListNode<T> = DoublyListNode.create(key, val);
        this.insert2Head(newNode);
        this._map.set(key, newNode);
        this._size++;
    }

    /** 将已有的节点移动到头部 */
    private move2Head(node: DoublyListNode<T>): void
    {
        this.deleteNode(node);
        this.insert2Head(node);
    }

    /** 插入一个新的节点到头节点 */
    private insert2Head(node: DoublyListNode<T>): void
    {
        const next: DoublyListNode<T> = this._dummyHead.next;
        this._dummyHead.next = node;
        node.prev = this._dummyHead;
        node.next = next;
        next.prev = node;
    }

    private makeLeastRecently(node: DoublyListNode<T>): void
    {
        this.move2Head(node);
    }

    /** 移除最近最少使用的节点 */
    private removeLeastRecently(): void
    {
        let prev: DoublyListNode<T> = this._dummyTail.prev;
        let prevKey = prev.key;
        this.deleteNode(prev, true);
        this._map.delete(prevKey);
        this._size--;
    }

    private deleteNode(node: DoublyListNode<T>, isDestroy: boolean = false): void
    {
        let prev: DoublyListNode<T> = node.prev;
        let next: DoublyListNode<T> = node.next;

        // 排除 dummy 节点
        if (prev && next)
        {
            next.prev = prev;
            prev.next = next;
            node.clear(isDestroy);
        }
    }

    public size(): number
    {
        return this._size;
    }

    /**
     * @override
     */
    public clear(): void
    {
        throw "override it";
    }
}