import { Component } from '../Component';
import Logger from '../Logger';
import Util from '../Util';
import './styles/LibraryFilter.scss';
import { Snackbar } from '../ui/Snackbar';
import { Select } from '../ui/Select';
import { Database } from '../Database';
import { Checkbox, CheckboxShape } from '../ui/Checkbox';
import { Language } from '../Language';

const { chrome, Array } = window as any;


export class LibraryFilter extends Component {

    /**
     * Name of the component
     *
     * @type {string}
     * @memberof LibraryFilter
     */
    name: string = Language.get('library-filter.name');

    /**
     * List of games and game data imported from the DOM
     *
     * @type {*}
     * @memberof LibraryFilter
     */
    games: any = {};

    /**
     * Snackbar used to display messages when hiding and showing games
     *
     * @type {Snackbar}
     * @memberof LibraryFilter
     */
    snackbar: Snackbar;

    /**
     * Filter bar allowing for controls of the library filter
     *
     * @type {HTMLElement}
     * @memberof LibraryFilter
     */
    filterBar: HTMLElement;

    /**
     * Select box used to order the games
     *
     * @type {Select}
     * @memberof LibraryFilter
     */
    select: Select;

    /**
     * Current filtering order
     *
     * @type {FilterOrder}
     * @memberof LibraryFilter
     */
    order: FilterOrder;

    /**
     * Should all games be shown regardless if theyre hidden or not?
     *
     * @type {boolean}
     * @memberof LibraryFilter
     */
    showAll: boolean;
    checkbox: HTMLElement;

    direction: OrderDirection;

    gameTiles: NodeList;
    database: Database;
    uuidMap: Database;

    constructor(snackbar: Snackbar, database: Database, uuidMap: Database) {
        super();

        // Import database & uuidMap from index.js
        this.database = database;
        this.uuidMap = uuidMap;
        
        // Import snackbar from index.js
        this.snackbar = snackbar;

        // Create new filter bar element
        this.filterBar = document.createElement('div');
        this.filterBar.classList.add('stadiaplus_libraryfilter-bar');
    }

    /**
     * Creates a wrapper around every game and initializes the elements necessary to show or hide it.
     *
     * @memberof LibraryFilter
     */
    createAllWrappers() {
        this.getStorage(() => {
            let i = 0;
            this.gameTiles.forEach((tile) => {
                i++;
                const element = tile as Element;
                this.createWrapper(element, this.getUUID(element));
                
                if(i === this.gameTiles.length) {
                    this.updateSortDirection();
                    this.sortGames();
                }
            });
        });
    }

    /**
     * Get the game UUID from it's jslog attribute.
     *
     * @param {Element} tile
     * @returns
     * @memberof LibraryFilter
     */
    getUUID(tile: Element) {
        return tile
            .getAttribute('jslog')
            .split('; ')[1]
            .substring(3);
    }


    wrapperExists(uuid: string) {
        return this.renderer.querySelector('#' + this.id + '-' + uuid);
    }

    /**
     * Given a tile element, create a wrapper around it and an icon allowing it to be shown or hidden.
     *
     * @param {Element} element the game element
     * @param {string} uuid the game uuid
     * @memberof LibraryFilter
     */
    createWrapper(element: Element, uuid: string) {
        if(this.wrapperExists(uuid)) return;

        const connection = this.database.getConnection()['data'];
        const map = this.uuidMap.getConnection()['uuidMap'];
        const entry = connection[map[uuid]];

        // Create the wrapper
        const wrapper = document.createElement('div');
        wrapper.setAttribute('game-uuid', uuid);
        wrapper.setAttribute('game-name', entry[1]);
        wrapper.classList.add('stadiaplus_libraryfilter-wrapper');
        wrapper.id = this.id + '-' + uuid;

        // Create the icon
        const icon = document.createElement('div');
        icon.classList.add('stadiaplus_libraryfilter-icon');
        icon.innerHTML = 'visibility';

        // Wrap the wrapper around the element and add the icon before it
        element.parentNode.insertBefore(wrapper, element);
        wrapper.appendChild(icon);
        wrapper.appendChild(element);

        // Check the storage for visibility, hide the game if both 'visible' and 'showAll' is false
        if (!this.games.hasOwnProperty(uuid)) {
            this.games[uuid] = { visible: true };
        } 
        else if (!this.games[uuid].visible && !this.showAll) {
            wrapper.classList.add('closed');
        }

        // Position the icon in the top right corner rather than the top left using 
        // a margin (using the 'left' css attribute is not possible)
        icon.style.marginLeft = element.clientWidth - icon.clientWidth + 'px';
        icon.style.transformOrigin = `calc(100% - ${element.clientWidth/2}px) ${element.clientHeight/2}px`;

        // When the icon is clicked on
        icon.addEventListener('click', () => {
            const visible = this.games[uuid].visible;

            // If the game is visible, set it to hidden
            if (visible) {
                this.snackbar.activate(Language.get('snackbar.hide-game'));
                this.games[uuid].visible = false;
            } 
            else { // Otherwise set it to shown
                this.snackbar.activate(Language.get('snackbar.show-game'));
                this.games[uuid].visible = true;
            }

            // Update the game's visibility
            this.updateGame(wrapper, element, true);
            this.setStorage();
        });
    }

    /**
     * Updates a game's visibility, making sure it's only shown when it's supposed to
     *
     * @param {Element} wrapper The game's wrapper, created by [[createWrapper]]
     * @param {Element} tile The game tile
     * @param {boolean} animate Should the game have an animated closing effect?
     * @memberof LibraryFilter
     */
    updateGame(wrapper: Element, tile: Element, animate: boolean) {
        // Get the game UUID
        const uuid = this.getUUID(tile);

        // Get the game icon
        const icon = wrapper.querySelector(
            '.stadiaplus_libraryfilter-icon',
        ) as HTMLElement;

        // If the game isn't visible...
        if (!this.games[uuid].visible) {
            // ...but all games should still be shown
            if (this.showAll) {
                // Set the icon to display that it's not visible but shown anyways
                icon.innerHTML = 'visibility_off';

                // Make sure the element isn't hidden
                wrapper.classList.remove('closing', 'closed');
            } 
            else { // Otherwise...
                // ...if the hiding should be animated
                if (animate) {
                    // Fade the game tile out
                    wrapper.classList.add('closing');

                    // After 1 second, hide it
                    setTimeout(() => {
                        wrapper.classList.add('closed');
                    }, 1000);
                } 
                else { // Otherwise
                    // Hide the element normally
                    wrapper.classList.add('closed');
                }
            }
        } else { // If the game is visible
            // Make sure the icon stays in place and doesn't get reset back to the top left corner
            icon.style.marginLeft = tile.clientWidth - icon.clientWidth + 'px';

            // Make sure the icon shows that it is visible
            icon.innerHTML = 'visibility';
        }
        
    }

    /**
     * Update all games, shorthand for looping through tiles and updating them individually
     *
     * @memberof LibraryFilter
     */
    updateAllGames() {
        this.sortGames();

        this.gameTiles.forEach((tile) => {
            this.updateGame(tile.parentElement, tile as Element, false);
        });
    }

    /**
     * Read the stored data from the synchronized chrome storage (stored in your user data)
     *
     * @param {Function} [callback] // Callback that is run after the data has been read
     * @memberof LibraryFilter
     */
    getStorage(callback?: Function) {
        if(!this.enabled) {
            this.games = {};
            if (callback) callback();
        }

        chrome.storage.sync.get(['games', 'sort-order', 'sort-direction'], (result: any) => {
            this.games = result.games !== undefined ? result.games : {};
            this.order = result['sort-order'] !== undefined ? result['sort-order'] : FilterOrder.RECENT;
            this.direction = result['sort-direction'] !== undefined ? result['sort-direction'] : OrderDirection.ASCENDING;

            if (callback) callback();
        });
    }

    /**
     * Write to the synchronized chrome storage (stored in your user data)
     *
     * @param {Function} [callback] // Callback that is run after the data has been written
     * @returns
     * @memberof LibraryFilter
     */
    setStorage(callback?: Function) {
        if(!this.enabled) {
            if (callback) callback();
            return;
        }

        chrome.storage.sync.set({ games: this.games, 'sort-order': this.order, 'sort-direction': this.direction }, callback);
    }

    /**
     * Runs when the component has loaded
     *
     * @memberof LibraryFilter
     */
    onStart(): void {
        this.enabled = true;
        Logger.component(Language.get('component.enabled', { name: this.name }));
    }

    private eventsExist: boolean;
    /**
     * Adds a variety of events to the filter bar
     *
     * @memberof LibraryFilter
     */
    addFilterBarEvents() {
        // When the order is changed, set it in the storage
        this.select.element.addEventListener('change', () => {
            this.order = parseInt(this.select.get()[0]) as FilterOrder;
            this.sortGames();
            this.setStorage();
        });

        // When the show all checkbox is clicked, toggle the showAll variable and update the games
        this.checkbox.addEventListener('click', () => {
            this.showAll = (this.checkbox as any).checked;
            this.updateAllGames();
        });

        const dir = this.renderer.querySelector('#' + this.filterBar.id + '-direction');
        // Toggle the sort direction
        dir.addEventListener('click', () => {
            this.updateSortDirection();
            event.stopPropagation();
        });

        this.eventsExist = true;
    }

    updateSortDirection() {
        const element: Element = this.renderer.querySelector('#' + this.filterBar.id + '-direction');

        if(element) {
            if(this.direction === OrderDirection.ASCENDING) {
                this.direction = OrderDirection.DESCENDING;
                element.classList.add('descending');
                element.classList.remove('ascending');
            }
            else {
                this.direction = OrderDirection.ASCENDING;
                element.classList.add('ascending');
                element.classList.remove('descending');
            }
        }

        this.sortGames();
        this.setStorage();
    }

    /**
     * Runs when the component is stopped, destroys necessary parts
     *
     * @memberof LibraryFilter
     */
    onStop(): void {
        this.enabled = false;
        document
            .querySelectorAll('.stadiaplus_libraryfilter-icon')
            .forEach((e) => e.remove());
        Logger.component(Language.get('component.disabled', { name: this.name }));
    }

    sortGames() {
        let arr = (Array.from(this.gameTiles) as Element[]).map(e => e.parentElement); // Get all wrappers as an array
        arr = arr.sort(FilterOrder.getSorter(this.order));

        if(this.direction === OrderDirection.ASCENDING) {
            arr = arr.reverse();
        }

        arr.forEach(el => {
            el.parentElement.prepend(el);
        })
    }

    onUpdate() {
        if(Util.isInHome()) {
            if(!this.exists()) {
                this.updateRenderer();
                
                const container = this.renderer.querySelector('.CVVXfc.YYy3Zb');
                if(!container) return;

                this.filterBar.id = this.id;
                this.filterBar.innerHTML = `
                    <span class="material-icons-extended">
                        sort
                    </span>
                    <select name="order">
                        <option value="${FilterOrder.RECENT}">${Language.get('library-filter.recent')}</option>
                        <option value="${FilterOrder.ALPHABETICAL}">${Language.get('library-filter.alphabetical')}</option>
                        <option value="${FilterOrder.RANDOM}">${Language.get('library-filter.random')}</option>
                    </select>
                    <span id='${this.filterBar.id + '-direction'}' class="material-icons-extended ascending stadiaplus_filterbar-direction"></span>
                `;

                const {pretty, checkbox} = new Checkbox(Language.get('library-filter.show-hidden')).setBigger(true).setShape(CheckboxShape.CURVED).build();
                pretty.classList.add('stadiaplus_filterbar-checkbox');
                this.filterBar.appendChild(pretty);
                this.checkbox = checkbox;
                this.gameTiles = this.renderer.querySelectorAll('.GqLi4d');
                container.appendChild(this.filterBar);

                this.createAllWrappers();

                // Style the custom select box in the filter bar
                this.select = new Select(
                    this.filterBar.querySelector('select'),
                    FilterOrder.RECENT,
                );

                this.select.set(this.order);

                this.addFilterBarEvents();
            }
        }
    }  
}

export class FilterOrder {
    static RECENT = 0;
    static ALPHABETICAL = 1;
    static ALPHABETICAL_REVERSE = 2;
    static RANDOM = 3;

    static getSorter(order: FilterOrder) {
        switch(order) {
            case this.RECENT: 
                return this.sortRecent;

            case this.ALPHABETICAL: 
                return this.sortAlphabetical;

            case this.RANDOM: 
                return this.sortRandom;
        }
    }

    private static sortRecent(a:any, b:any) {
        return 1;
    }

    private static sortAlphabetical(a:any, b:any) {
        const nameA = a.getAttribute('game-name');
        const nameB = b.getAttribute('game-name');

        if(nameA === undefined || nameB === undefined) {
            return 1;
        }

        return nameA.localeCompare(nameB);
    }

    private static sortRandom(a:any, b:any) {
        return Math.round(Math.random() * 2) - 1;
    }
}

export enum OrderDirection {
    ASCENDING,
    DESCENDING
}