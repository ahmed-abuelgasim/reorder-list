/* IMPORTS */
const NAME = 'ace';


/* COMPONENT NAME */
export const REORDER_LIST = `${NAME}-reorder-list`;


/* CONSTANTS */
export const ATTRS = {
	BTN: `${REORDER_LIST}-item-btn`,
	ITEM: `${REORDER_LIST}-item`,
	ITEM_GRABBED: `${REORDER_LIST}-item-grabbed`,
	LIST: `${REORDER_LIST}-list`,
	REORDERING: `${REORDER_LIST}-reordering`,
};


export const EVENTS = {
	OUT: {
		READY: `${REORDER_LIST}-ready`,
	},
};


/* CLASS */
export default class ReorderList extends HTMLElement {
	private cursorStartPos: number | undefined;
	private liEls: HTMLLIElement[] = [];
	private moveDistance: number | undefined;
	private moveStarted = false;
	private movingLiEls = false;
	private nextSiblingIndex: number | undefined;
	private nextSiblingMidpoint: number | undefined;
	private previousTouch: Touch | undefined;
	private prevSiblingIndex: number | undefined;
	private prevSiblingMidpoint: number | undefined;
	private selectedLiEl: HTMLLIElement | undefined;
	private selectedLiElIndex: number | undefined;
	private selectedLiElIndexDiff: number | undefined;
	private ulEl: HTMLUListElement | HTMLOListElement | undefined;
	private ulElBottom: number | undefined;
	private ulElTop: number | undefined;


	constructor() {
		super();


		/* CLASS METHOD BINDINGS */
		this.endMove = this.endMove.bind(this);
		this.mouseDownHandler = this.mouseDownHandler.bind(this);
		this.setNextSiblingMidpoint = this.setNextSiblingMidpoint.bind(this);
		this.setPrevSiblingMidpoint = this.setPrevSiblingMidpoint.bind(this);
		this.translateLiEl = this.translateLiEl.bind(this);
		this.updateSiblingLiIndexes = this.updateSiblingLiIndexes.bind(this);
		this.windowMouseMoveHandler = this.windowMouseMoveHandler.bind(this);
	}


	public connectedCallback(): void {
		/* GET DOM ELEMENTS */
		this.ulEl = this.querySelector(`[${ATTRS.LIST}]`) as HTMLUListElement;
		this.liEls = [...this.querySelectorAll(`[${ATTRS.ITEM}]`)] as HTMLLIElement[];

		/* ADD EVENT LISTENERS */
		this.ulEl.addEventListener('mousedown', this.mouseDownHandler);
		this.ulEl.addEventListener('touchstart', this.mouseDownHandler);
		window.addEventListener('mouseup', this.endMove);
		window.addEventListener('touchend', this.endMove);
	}


	public disconnectedCallback(): void {
		/* REMOVE EVENT LISTENERS */
		this.ulEl!.removeEventListener('mousedown', this.mouseDownHandler);
		this.ulEl!.removeEventListener('touchstart', this.mouseDownHandler);
		window.removeEventListener('mouseup', this.endMove);
		window.removeEventListener('touchend', this.endMove);
	}


	private endMove(): void {
		if (!this.moveStarted || !this.ulEl || !this.selectedLiEl || this.selectedLiElIndex == undefined || this.selectedLiElIndexDiff == undefined) {
			return;
		}

		const newSelectedLiElIndex = this.selectedLiElIndex + this.selectedLiElIndexDiff;
		if (this.selectedLiElIndexDiff) {
			const insertBeforeElIndex = this.selectedLiElIndexDiff < 0 ?
				newSelectedLiElIndex :
				newSelectedLiElIndex + 1;
			this.ulEl!.insertBefore(this.selectedLiEl, this.liEls[insertBeforeElIndex]);
			this.liEls.splice(this.selectedLiElIndex, 1);
			this.liEls.splice(newSelectedLiElIndex, 0, this.selectedLiEl);
		}

		this.ulEl.removeAttribute(ATTRS.REORDERING);
		this.liEls.forEach(liEl => liEl.style.transform = '');
		this.selectedLiEl.removeAttribute(ATTRS.ITEM_GRABBED);
		this.selectedLiEl.style.top = '';

		this.moveStarted = false;
		this.previousTouch = undefined;

		window.removeEventListener('mousemove', this.windowMouseMoveHandler);
		window.removeEventListener('touchmove', this.windowMouseMoveHandler);
	}


	private mouseDownHandler(e: Event): void {
		if (!this.ulEl) {
			return;
		}

		const targetEl = e.target as Element;
		if (!targetEl || !targetEl.closest(`[${ATTRS.BTN}]`)) {
			return;
		}

		this.selectedLiEl = targetEl.closest(`[${ATTRS.ITEM}]`) as HTMLLIElement;
		if (!this.selectedLiEl) {
			return;
		}

		if (e instanceof TouchEvent) {
			e.preventDefault();
		}

		this.moveStarted = true;
		this.cursorStartPos = e instanceof MouseEvent ?
			e.pageY:
			(e as TouchEvent).touches[0].pageY;

		const ulRect = this.ulEl.getBoundingClientRect();
		this.ulElTop = ulRect.top + window.scrollY;
		this.ulElBottom = ulRect.bottom + window.scrollY;

		this.ulEl.setAttribute(ATTRS.REORDERING, '');
		this.selectedLiEl.setAttribute(ATTRS.ITEM_GRABBED, '');

		this.selectedLiElIndexDiff = 0;
		this.selectedLiElIndex = this.liEls.indexOf(this.selectedLiEl);

		this.prevSiblingIndex = this.selectedLiElIndex - 1;
		this.setPrevSiblingMidpoint(this.prevSiblingIndex);
		this.nextSiblingIndex = this.selectedLiElIndex + 1;
		this.setNextSiblingMidpoint(this.nextSiblingIndex);

		// We can replace this with just selectedLiEl.offsetHeight if we force li elements to have no margin, use inner element and padding instead;
		const selectedLiElStyles = window.getComputedStyle(this.selectedLiEl);
		this.moveDistance = this.selectedLiEl.offsetHeight + parseInt(selectedLiElStyles.marginTop) + parseInt(selectedLiElStyles.marginBottom);

		window.addEventListener('mousemove', this.windowMouseMoveHandler);
		window.addEventListener('touchmove', this.windowMouseMoveHandler);
	}


	private setNextSiblingMidpoint(liElIndex: number): void {
		this.nextSiblingMidpoint = Number.POSITIVE_INFINITY;
		const nextSibling = this.liEls[liElIndex];
		if (nextSibling) {
			const nextSiblingRect = nextSibling.getBoundingClientRect();
			this.nextSiblingMidpoint = nextSiblingRect.top + window.scrollY + nextSiblingRect.height / 2;
		}
	}


	private setPrevSiblingMidpoint(liElIndex: number): void {
		this.prevSiblingMidpoint = Number.NEGATIVE_INFINITY;
		const prevSibling = this.liEls[liElIndex];
		if (prevSibling) {
			const prevSiblingRect = prevSibling.getBoundingClientRect();
			this.prevSiblingMidpoint = prevSiblingRect.top + window.scrollY + prevSiblingRect.height / 2;
		}
	}


	private translateLiEl(index: number, translateVal: number): void {
		const targetLiEl = this.liEls[index];
		const currentTransform = targetLiEl.style.transform;
		targetLiEl.style.transform = currentTransform ?
			'' :
			`translate3d(0px, ${translateVal}px, 0px)`;
	}


	private updateSiblingLiIndexes(direction: -1 | 1): void {
		if (this.nextSiblingIndex == undefined || this.prevSiblingIndex == undefined) {
			return;
		}

		this.nextSiblingIndex += direction;
		this.prevSiblingIndex += direction;

		// Choose index of previous li if index is that of grabbedEl
		if (this.prevSiblingIndex == this.selectedLiElIndex) {
			this.prevSiblingIndex += direction;
		}
		if (this.nextSiblingIndex == this.selectedLiElIndex) {
			this.nextSiblingIndex += direction;
		}
	}


	private windowMouseMoveHandler(e: MouseEvent | TouchEvent): void {
		if (
			this.cursorStartPos == undefined ||
			this.moveDistance == undefined ||
			this.nextSiblingIndex == undefined ||
			this.nextSiblingMidpoint == undefined ||
			this.prevSiblingIndex == undefined ||
			this.prevSiblingMidpoint == undefined ||
			this.selectedLiElIndex == undefined ||
			this.selectedLiElIndexDiff == undefined ||
			this.ulElBottom == undefined ||
			this.ulElTop == undefined
		) {
			return;
		}

		if (this.movingLiEls || !this.selectedLiEl) {
			return;
		}

		let movementY;
		let cursorPos;

		if (e instanceof MouseEvent) {
			cursorPos = e.pageY;
			movementY = e.movementY;
		} else { //TouchEvent
			e.preventDefault();
			const touch = e.touches[0];
			cursorPos = touch.pageY;
			movementY = touch.pageY - (this.previousTouch == undefined ? 0 : this.previousTouch.pageY);
			this.previousTouch = touch;
		}

		if (movementY == 0) {
			return;
		}

		// Anchor element Y position to cursor
		this.selectedLiEl.style.top = `${cursorPos - this.cursorStartPos}px`;
		// Scroll page with grabbed element
		if (cursorPos >= this.ulElTop && cursorPos <= this.ulElBottom) {
			this.selectedLiEl.scrollIntoView({
				behaviour: 'smooth',
				block: 'nearest',
			} as ScrollIntoViewOptions);
		}

		// If cursor crosses previous or next sibling li's midpoint
		if (cursorPos < this.prevSiblingMidpoint || cursorPos > this.nextSiblingMidpoint) {
			this.movingLiEls = true;
			const moveDirection = movementY < 0 ? -1 : 1;
			const movingUp = moveDirection == -1;
			const translateVal = -(this.moveDistance * moveDirection);

			while (
				(movingUp && this.prevSiblingIndex >= 0) ||
				(!movingUp && this.nextSiblingIndex < this.liEls.length)
			){
				if (
					(movingUp && cursorPos >= this.prevSiblingMidpoint) ||
					(!movingUp && cursorPos <= this.nextSiblingMidpoint)
				){
					break;
				}

				const elToTranslateIndex = movingUp ? this.prevSiblingIndex : this.nextSiblingIndex;
				this.translateLiEl(elToTranslateIndex, translateVal);
				this.updateSiblingLiIndexes(moveDirection);

				// Update stored sibling midpoints
				if (movingUp) {
					// Can't use setNextSiblingMidpoint() because new sibling will transition
					this.nextSiblingMidpoint = this.prevSiblingMidpoint + this.moveDistance;
					this.setPrevSiblingMidpoint(this.prevSiblingIndex);
				} else {
					// Can't use setPrevSiblingMidpoint() because new sibling will transition
					this.prevSiblingMidpoint = this.nextSiblingMidpoint - this.moveDistance;
					this.setNextSiblingMidpoint(this.nextSiblingIndex);
				}
				this.selectedLiElIndexDiff += moveDirection;
			}

			this.movingLiEls = false;
		}
	}
}


/* REGISTER CUSTOM ELEMENT */
document.addEventListener('DOMContentLoaded', () => {
	customElements.define(REORDER_LIST, ReorderList);
});
