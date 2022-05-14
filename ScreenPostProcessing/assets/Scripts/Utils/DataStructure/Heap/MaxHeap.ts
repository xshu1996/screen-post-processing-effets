import { Heap } from "./Heap";

export interface IGetCompareValue<T>
{
    (value: T): number | string;
}

const getMaxCompare = (getCompareValue) => (a, b) =>
{
    const aVal = typeof getCompareValue === 'function' ? getCompareValue(a) : a;
    const bVal = typeof getCompareValue === 'function' ? getCompareValue(b) : b;
    return aVal < bVal ? 1 : -1;
};

/**
 * @class MaxHeap
 * @extends Heap
 */
export class MaxHeap<T>
{
    private _heap: Heap<T> = null;
    private _getCompareValue = null;

    /**
     * @param {function} [getCompareValue]
     * @param {Heap} [_heap]
     */
    constructor(getCompareValue?: IGetCompareValue<T>, _heap?: Heap<T>)
    {
        this._getCompareValue = getCompareValue;
        this._heap = _heap || new Heap(getMaxCompare(getCompareValue));
    }

    /**
     * Inserts a new value into the heap
     * @public
     * @param {number|string|object} value
     * @returns {MaxHeap}
     */
    public insert(value: T): MaxHeap<T>
    {
        this._heap.insert(value);
        return this;
    }

    /**
     * Removes and returns the root node in the heap
     * @public
     * @returns {number|string|object}
     */
    public extractRoot(): T
    {
        return this._heap.extractRoot();
    }

    /**
     * Applies heap sort and return the values sorted by priority
     * @public
     * @returns {array}
     */
    public sort(): T[]
    {
        return this._heap.sort();
    }

    /**
     * Fixes node positions in the heap
     * @public
     * @returns {MaxHeap}
     */
    public fix(): MaxHeap<T>
    {
        this._heap.fix();
        return this;
    }

    /**
     * Verifies that all heap nodes are in the right position
     * @public
     * @returns {boolean}
     */
    public isValid(): boolean
    {
        return this._heap.isValid();
    }

    /**
     * Returns the root node in the heap
     * @public
     * @returns {number|string|object}
     */
    public root(): T
    {
        return this._heap.root();
    }

    /**
     * Returns a leaf node in the heap
     * @public
     * @returns {number|string|object}
     */
    public leaf(): T
    {
        return this._heap.leaf();
    }

    /**
     * Returns the number of nodes in the heap
     * @public
     * @returns {number}
     */
    public size(): number
    {
        return this._heap.size();
    }

    /**
     * Checks if the heap is empty
     * @public
     * @returns {boolean}
     */
    public isEmpty(): boolean
    {
        return this._heap.isEmpty();
    }

    /**
     * Clears the heap
     * @public
     */
    public clear(): void
    {
        this._heap.clear();
    }

    /**
     * Returns a shallow copy of the MaxHeap
     * @public
     * @returns {MaxHeap}
     */
    public clone(): MaxHeap<T>
    {
        return new MaxHeap(this._getCompareValue, this._heap.clone());
    }

    /**
     * Builds a MaxHeap from an array
     * @public
     * @static
     * @param {array} values
     * @param {function} [getCompareValue]
     * @returns {MaxHeap}
     */
    public static heapify<T>(values: T[], getCompareValue?: IGetCompareValue<T>): MaxHeap<T>
    {
        if (!Array.isArray(values))
        {
            throw new Error('MaxHeap.heapify expects an array');
        }
        const heap = new Heap(getMaxCompare(getCompareValue), values);
        return new MaxHeap(getCompareValue, heap).fix();
    }

    /**
     * Checks if a list of values is a valid max heap
     * @public
     * @static
     * @param {array} values
     * @param {function} [getCompareValue]
     * @returns {boolean}
     */
    public static isHeapified<T>(values: T[], getCompareValue?: IGetCompareValue<T>): boolean
    {
        const heap = new Heap(getMaxCompare(getCompareValue), values);
        return new MaxHeap(getCompareValue, heap).isValid();
    }
}