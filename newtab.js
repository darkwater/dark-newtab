let chromeHeight = 66; // address bar, tabs
let hintCharacters = "qwerasdfzxcv";

function updateBackgroundPosition() {
    document.firstElementChild.style.backgroundPositionX = ( -window.screenX ) + "px";
    document.firstElementChild.style.backgroundPositionY = ( -window.screenY - chromeHeight ) + "px";
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
    constructor(bookmarkFolder, groupIndex) {
        super(groupTemplate);

        let groupHint = hintCharacters[groupIndex];
        this.element.firstElementChild.setAttribute("group-hint", groupHint);

        this.getElement("title").innerText = bookmarkFolder.title;
        this.getElement("hint").innerText  = groupHint;

        let bookmarks = bookmarkFolder.children.map((child, bookmarkIndex) => {
            let hint = groupHint + hintCharacters[bookmarkIndex];
            return new Bookmark(child, hint);
        });

        let slot = this.getElement("bookmarks");
        bookmarks.forEach(bookmark => slot.appendChild(bookmark.element));
    }
}

class Bookmark extends Template {
    constructor(bookmark, hint) {
        super(bookmarkTemplate);

        let title = this.getElement("link");
        title.href = bookmark.url;
        title.setAttribute("bookmark-hint", hint);
        title.addEventListener("click", e => {
            // normal links don't work for local resources
            // such as file:// and chrome://
            e.preventDefault();
            chrome.tabs.getCurrent(tab => {
                if (tab.pinned) {
                    chrome.tabs.create({ url: bookmark.url, openerTabId: tab.id });
                    location.reload();
                } else {
                    chrome.tabs.update({ url: bookmark.url });
                }
            });
        });

        let label = this.getElement("label");
        label.innerText = bookmark.title;

        let icon = this.getElement("icon");
        icon.innerText = hint[1];
        let storeKey = "color for " + bookmark.url;
        chrome.storage.sync.get(storeKey, obj => {
            let color = obj[storeKey];

            if (color) {
                icon.style.color = color;
                icon.style.backgroundColor = color;
            } else {
                let img = document.createElement("img");
                img.src = "chrome://favicon/" + bookmark.url;
                img.onload = () => {
                    let color;
                    try {
                        let colors = new Vibrant(img, 32, 5);

                        color = "rgb(" + (
                            colors.LightVibrantSwatch ||
                            colors.LightMutedSwatch ||
                            colors.VibrantSwatch ||
                            colors.MutedSwatch ||
                            colors._swatches[0]
                        ).rgb.join() + ")";
                    } catch (_) {
                        color = "white";
                    }

                    let obj = {};
                    obj[storeKey] = color;
                    chrome.storage.sync.set(obj);
                    icon.style.color = color;
                    icon.style.backgroundColor = color;
                };
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    groupTemplate    = document.getElementById("tmpl-group");
    bookmarkTemplate = document.getElementById("tmpl-bookmark");
    container        = document.getElementById("container");

    chrome.bookmarks.getTree(tree => {
        let others = tree[0].children.find(folder => folder.title == "Other bookmarks");
        let newtab = others.children.find(folder => folder.title == "New Tab");

        let groups = newtab.children.map((folder, index) => new Group(folder, index));
        groups.forEach(group => container.appendChild(group.element));
    });

    let hintInput = document.getElementById("hint-input");
    hintInput.value = "";
    hintInput.addEventListener("focus",  () => document.body.classList.add("hint-mode"));
    hintInput.addEventListener("blur",   () => document.body.classList.remove("hint-mode"));
    hintInput.addEventListener("keydown", e => {
        let hint = hintInput.value;
        if (e.key.length == 1) hint += e.key;
        if (e.key == "Backspace") {
            hint = hint.substring(0, hint.length - 1);
            hintInput.classList.remove("invalid");
        }
        if (e.key == "Escape") {
            hint = "";
            hintInput.value = "";
            hintInput.classList.remove("invalid");
        }

        let groupHint = hint[0];

        document.querySelectorAll(".group").forEach(elem => {
            elem.setAttribute("hint-fadeout", !!groupHint && (elem.getAttribute("group-hint") != groupHint));
        });

        if (hint.length == 2) {
            let bookmark = document.querySelector(`.bookmark-link[bookmark-hint="${hint}"]`);

            if (bookmark) {
                bookmark.classList.add("selected");
                bookmark.click();
                setTimeout(() => bookmark.classList.remove("selected"), 3000);
            } else {
                hintInput.classList.add("invalid");
            }
        }
    });
});
