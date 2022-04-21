export interface LRU<K, V>
{
    get(key: K): V | undefined;
    put(key: K, val: V): void;
}

export class LURCache<K, V> implements LRU<K, V>
{
    /** 默认容积 */
    private static DEFAULT_CAPACITY: number = 8;
    private cache: K[]; // TODO: 改用双向链表
    private map: Map<K, V>;
    private capacity: number;

    constructor(capacity: number = LURCache.DEFAULT_CAPACITY)
    {
        this.capacity = capacity;
        this.cache = [];
        this.map = new Map();
    }

    public getCapacity(): number
    {
        return this.capacity;
    }

    public get(key: K): V | undefined
    {
        // throw new Error("Method node implemented");
        if (!this.map.has(key))
        {
            return;
        }

        this.makeRecently(key);
        return this.map.get(key);
    }

    public put(key: K, val: V): void
    {
        // throw new Error("Method node implemented");
        if (this.map.has(key))
        {
            this.makeRecently(key);
            this.map.set(key, val);
            return;
        }
        // 如果容量到达上限，删除最近最少使用
        if (this.cache.length >= this.capacity)
        {
            this.removeLeastRecently();
        }

        this.addRecently(key, val);
    }

    private makeRecently(key: K): void
    {
        const index: number = this.cache.indexOf(key);
        this.cache.splice(index, 1);
        this.cache.push(key);
    }

    private removeLeastRecently(): void
    {
        const key = this.cache.shift();
        this.map.delete(key);
    }

    private addRecently(key: K, val: V): void
    {
        this.cache.push(key);
        this.map.set(key, val);
    }
}