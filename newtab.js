let chrome_height = 66; // address bar, tabs

function updateBackgroundPosition() {
    document.firstElementChild.style.backgroundPositionX = ( -window.screenX ) + "px";
    document.firstElementChild.style.backgroundPositionY = ( -window.screenY - chrome_height ) + "px";
}
updateBackgroundPosition();
setInterval(updateBackgroundPosition, 100);

let groupTemplate, bookmarkTemplate, container;

class Template {
    constructor(templateElement) {
        this.element = templateElement.content.cloneNode(true);
    }

    getElement(name) {
        return this.element.querySelector(`[name="${name}"]`);
    }
}

class Group extends Template {
    constructor(bookmarkFolder) {
        super(groupTemplate);

        this.getElement("title").innerText = bookmarkFolder.title;

        let bookmarks = bookmarkFolder.children.map(child => new Bookmark(child));
        let slot = this.getElement("bookmarks");
        bookmarks.forEach(bookmark => slot.appendChild(bookmark.element));
    }
}

class Bookmark extends Template {
    constructor(bookmark) {
        super(bookmarkTemplate);

        let title = this.getElement("title");
        title.firstElementChild.innerText = bookmark.title;
        title.href = bookmark.url;
        title.addEventListener("click", e => {
            // normal links don't work for local resources
            // such as file:// and chrome://
            e.preventDefault();
            chrome.tabs.update({ url: bookmark.url });
        });

        let img = document.createElement("img");
        img.src = "chrome://favicon/" + bookmark.url;
        img.classList.add("bookmark-icon");
        title.insertAdjacentElement("afterbegin", img);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    groupTemplate    = document.getElementById("tmpl-group");
    bookmarkTemplate = document.getElementById("tmpl-bookmark");
    container        = document.getElementById("container");

    chrome.bookmarks.getTree(tree => {
        let others = tree[0].children.find(folder => folder.title == "Other bookmarks");
        let newtab = others.children.find(folder => folder.title == "New Tab");

        let groups = newtab.children.map(folder => new Group(folder));
        groups.forEach(group => container.appendChild(group.element));
    });
});
