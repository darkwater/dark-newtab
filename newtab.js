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

        let title = this.getElement("link");
        title.href = bookmark.url;
        title.addEventListener("click", e => {
            // normal links don't work for local resources
            // such as file:// and chrome://
            e.preventDefault();
            chrome.tabs.update({ url: bookmark.url });
        });

        let label = this.getElement("label");
        label.innerText = bookmark.title;

        let icon = this.getElement("icon");
        let store_key = "color for " + bookmark.url;
        chrome.storage.sync.get(store_key, obj => {
            let color = obj[store_key];

            if (color) {
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
                    obj[store_key] = color;
                    chrome.storage.sync.set(obj);
                    icon.style.backgroundColor = color;
                    icon.attributes['data-color'] = color;
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

        let groups = newtab.children.map(folder => new Group(folder));
        groups.forEach(group => container.appendChild(group.element));
    });
});
