const useScrollIntoView = (): boolean => 'scrollBehavior' in document.documentElement.style;


/* COMPONENT NAME */
export const REORDER_LIST = `ace-reorder-list`;


/* CONSTANTS */
export const ATTRS = {
	BTN: `${REORDER_LIST}-item-btn`,
	GRABBED_ITEM: `${REORDER_LIST}-grabbed-item`,
	ITEM: `${REORDER_LIST}-item`,
	LIST: `${REORDER_LIST}-list`,
	REORDERING: `${REORDER_LIST}-reordering`,
};


/* CLASS */
export default class ReorderList extends HTMLElement {
	private cursorStartPos: number | undefined;
	private grabbedItemEl: HTMLLIElement | null = null;
	private grabbedItemElHeight: number | undefined;
	private grabbedItemIndex: number | null = null;
	private grabbedItemIndexChange = 0;
	private itemEls: HTMLCollectionOf<HTMLLIElement> | null = null;
	private listEl: HTMLUListElement | HTMLOListElement | undefined;
	private listElBottom: number | undefined;
	private listElTop: number | undefined;
	private movingItemEls = false;
	private nextSiblingIndex: number | undefined;
	private nextSiblingMidpoint: number | undefined;
	private prevSiblingIndex: number | undefined;
	private prevSiblingMidpoint: number | undefined;


	constructor() {
		super();


		/* CLASS METHOD BINDINGS */
		this.dropGrabbedEl = this.dropGrabbedEl.bind(this);
		this.getNextSiblingMidpoint = this.getNextSiblingMidpoint.bind(this);
		this.getPrevSiblingMidpoint = this.getPrevSiblingMidpoint.bind(this);
		this.grabItem = this.grabItem.bind(this);
		this.pointerDownHandler = this.pointerDownHandler.bind(this);
		this.pointerMoveHandler = this.pointerMoveHandler.bind(this);
		this.pointerUpHandler = this.pointerUpHandler.bind(this);
		this.resetMove = this.resetMove.bind(this);
		this.updateSiblingIndexes = this.updateSiblingIndexes.bind(this);
	}


	public connectedCallback(): void {
		/* GET DOM ELEMENTS */
		this.listEl = this.querySelector(`[${ATTRS.LIST}]`) as HTMLUListElement | HTMLOListElement;
		this.itemEls = this.listEl.getElementsByTagName('li');


		/* ADD EVENT LISTENERS */
		this.listEl.addEventListener('pointerdown', this.pointerDownHandler);
		this.listEl.addEventListener('touchstart', this.touchStartHandler);
		window.addEventListener('pointerup', this.pointerUpHandler);
	}


	public disconnectedCallback(): void {
		/* REMOVE EVENT LISTENERS */
		this.listEl?.removeEventListener('pointerdown', this.pointerDownHandler);
		this.listEl?.removeEventListener('touchstart', this.touchStartHandler);
		window.removeEventListener('pointerup', this.pointerUpHandler);
	}


	/*
		Drop grabbed item at new index based on this.grabbedItemIndexChange
	*/
	private dropGrabbedEl(): void {
		if (this.grabbedItemIndexChange) {
			const newIndex = this.grabbedItemIndex! + this.grabbedItemIndexChange;
			const insertBeforeElIndex = this.grabbedItemIndexChange < 0 ?
				newIndex :
				newIndex + 1;
			this.listEl!.insertBefore(this.grabbedItemEl!, this.itemEls![insertBeforeElIndex]);
		}
		this.resetMove();
	}


	/*
		Get the total height of the grabbed item including vertical margins
	*/
	private getItemHeight(itemEl: HTMLLIElement): number {
		// We can replace this with just selectedLiEl.offsetHeight if we force li elements to have no margin, use inner element and padding instead
		const selectedLiElStyles = window.getComputedStyle(itemEl);
		const topMargin = parseInt(selectedLiElStyles.marginTop);
		const bottomMargin = parseInt(selectedLiElStyles.marginBottom);
		const height = itemEl!.offsetHeight + topMargin + bottomMargin;
		return height;
	}


	/*
		Get the top and bottom position of listEl
	*/
	private getListBounds(listEl: HTMLUListElement | HTMLOListElement): [number, number] {
		const ulRect = listEl.getBoundingClientRect();
		const top = ulRect.top + window.scrollY;
		const bottom = ulRect.bottom + window.scrollY;
		return [top, bottom];
	}


	/*
		Get midpoint of sibling at given index. Returns Number.POSITIVE_INFINITY if there's no item at given index.
	*/
	private getNextSiblingMidpoint(siblingIndex: number): number {
		return this.getSiblingMidpoint(this.itemEls![siblingIndex], true);
	}


	/*
		Get midpoint of sibling at given index. Returns Number.NEGATIVE_INFINITY if there's no item at given index.
	*/
	private getPrevSiblingMidpoint(siblingIndex: number): number {
		return this.getSiblingMidpoint(this.itemEls![siblingIndex]);
	}


	/*
		Get the midpoint of a given sibling element based on it's position (previous or next)
	*/
	private getSiblingMidpoint(siblingEl: HTMLLIElement, isNextSibling = true): number {
		let siblingMidpoint = isNextSibling ?	Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
		if (siblingEl) {
			const siblingRect = siblingEl.getBoundingClientRect();
			siblingMidpoint = siblingRect.top + window.scrollY + siblingRect.height / 2;
		}
		return siblingMidpoint;
	}


	/*
		Grab element and optionally add grabbed styles
	*/
	private grabItem(element: HTMLLIElement, setGrabbedStyles = true): void {
		this.grabbedItemEl = element;
		const index = [...this.itemEls!].indexOf(element);
		this.grabbedItemIndex = index;

		if (!setGrabbedStyles) {
			return;
		}

		this.listEl!.setAttribute(ATTRS.REORDERING, '');
		this.grabbedItemEl.setAttribute(ATTRS.GRABBED_ITEM, '');
	}


	/*
		Handle pointerdown events on list
	*/
	private pointerDownHandler(event: Event): void {
		const targetEl = event.target as Element;
		const reorderBtnClicked = targetEl.closest(`[${ATTRS.BTN}]`);
		if (!reorderBtnClicked) {
			return;
		}

		this.cursorStartPos = (event as PointerEvent).pageY;

		const itemElClicked = targetEl.closest(`[${ATTRS.ITEM}]`) as HTMLLIElement;
		this.grabItem(itemElClicked);

		[this.listElTop, this.listElBottom] = this.getListBounds(this.listEl!);
		this.grabbedItemElHeight = this.getItemHeight(this.grabbedItemEl!);

		this.prevSiblingIndex = this.grabbedItemIndex! - 1;
		this.nextSiblingIndex = this.grabbedItemIndex! + 1;
		this.prevSiblingMidpoint = this.getPrevSiblingMidpoint(this.prevSiblingIndex);
		this.nextSiblingMidpoint = this.getNextSiblingMidpoint(this.nextSiblingIndex);

		window.addEventListener('pointermove', this.pointerMoveHandler, { passive: false });
	}


	/*
		Handle pointermove events on window
	*/
	private pointerMoveHandler(event: Event): void {
		if (this.movingItemEls) {
			return;
		}

		if (!this.grabbedItemEl || (!this.grabbedItemIndex && this.grabbedItemIndex != 0)) {
			return;
		}

		const e = event as PointerEvent;
		const movementY = e.movementY;
		if (movementY == 0) {
			return;
		}

		const cursorPos = e.pageY;

		// Anchor element Y position to cursor and scroll page with grabbed element
		this.grabbedItemEl.style.top = `${cursorPos - (this.cursorStartPos ?? 0)}px`;
		if (
			useScrollIntoView() &&
			cursorPos >= this.listElTop! &&
			cursorPos <= this.listElBottom!
		) {
			this.grabbedItemEl.scrollIntoView({
				behaviour: 'smooth',
				block: 'nearest',
			} as ScrollIntoViewOptions);
		}

		// If cursor crosses previous or next sibling midpoint
		if (cursorPos < this.prevSiblingMidpoint! || cursorPos > this.nextSiblingMidpoint!) {
			this.movingItemEls = true;
			const moveDirection = movementY < 0 ? -1 : 1;
			const translateVal = -(this.grabbedItemElHeight! * moveDirection);
			const movingUp = moveDirection == -1;
			const movingDown = !movingUp;

			while (
				(movingUp && this.prevSiblingIndex! >= 0) ||
				(movingDown && this.nextSiblingIndex! < this.itemEls!.length)
			){
				if (
					(movingUp && cursorPos >= this.prevSiblingMidpoint!) ||
					(movingDown && cursorPos <= this.nextSiblingMidpoint!)
				){
					break;
				}

				const elToTranslateIndex = movingUp ? this.prevSiblingIndex! : this.nextSiblingIndex!;
				const elToTranslate = this.itemEls![elToTranslateIndex];
				this.translateItemEl(elToTranslate, translateVal);
				this.updateSiblingIndexes(moveDirection);

				// Update stored sibling midpoints
				if (movingUp) {
					// Can't use getNextSiblingMidpoint() because new sibling will transition
					this.nextSiblingMidpoint = this.prevSiblingMidpoint! + this.grabbedItemElHeight!;
					this.prevSiblingMidpoint = this.getPrevSiblingMidpoint(this.prevSiblingIndex!);
				} else {
					// Can't use getPrevSiblingMidpoint() because new sibling will transition
					this.prevSiblingMidpoint = this.nextSiblingMidpoint! - this.grabbedItemElHeight!;
					this.nextSiblingMidpoint = this.getNextSiblingMidpoint(this.nextSiblingIndex!);
				}
				this.grabbedItemIndexChange += moveDirection;
			}

			this.movingItemEls = false;
		}
	}


	/*
		Handle pointerup events on window
	*/
	private pointerUpHandler(): void {
		if (!this.grabbedItemEl || (!this.grabbedItemIndex && this.grabbedItemIndex != 0)) {
			return;
		}

		this.listEl!.removeAttribute(ATTRS.REORDERING);
		[...this.itemEls!].forEach(itemEl => itemEl.style.transform = '');
		this.grabbedItemEl.style.top = '';

		this.dropGrabbedEl();
		window.removeEventListener('pointermove', this.pointerMoveHandler);
	}


	/*
		Reset grabbed item state
	*/
	private resetMove(): void {
		this.grabbedItemEl?.removeAttribute(ATTRS.GRABBED_ITEM);
		this.grabbedItemEl = null;
		this.grabbedItemIndex = null;
		this.grabbedItemIndexChange = 0;
	}


	/*
	  Prevent page scrolling while dragging item on touchscreens
	*/
	private touchStartHandler(e: Event): void {
		const reorderBtnClicked = (e.target as Element).closest(`[${ATTRS.BTN}]`);
		if (reorderBtnClicked) {
			e.preventDefault();
		}
	}


	/*
		Translate given itemEl in Y-axis by a given value
	*/
	private translateItemEl(itemEl: HTMLLIElement, translateVal: number): void {
		const currentTransform = itemEl.style.transform;
		itemEl.style.transform = currentTransform ?
			'' :
			`translate3d(0px, ${translateVal}px, 0px)`;
	}


	/*
		Update sibling indexes based on a given direction of movement
	*/
	private updateSiblingIndexes(moveDirection: -1 | 1): void {
		if (this.nextSiblingIndex == undefined || this.prevSiblingIndex == undefined) {
			return;
		}

		this.prevSiblingIndex += moveDirection;
		this.nextSiblingIndex += moveDirection;

		// Choose index of previous li if index is that of grabbedEl
		if (this.prevSiblingIndex == this.grabbedItemIndex) {
			this.prevSiblingIndex += moveDirection;
		}

		// Choose index of next li if index is that of grabbedEl
		if (this.nextSiblingIndex == this.grabbedItemIndex) {
			this.nextSiblingIndex += moveDirection;
		}
	}
}



/* REGISTER CUSTOM ELEMENT */
document.addEventListener('DOMContentLoaded', () => {
	customElements.define(REORDER_LIST, ReorderList);
});
