// ##### Getting the csrf token for the fetch calls #####
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrftoken = getCookie('csrftoken');

// Pagination
// ##### receiving data from the session #####
const receiveDataFromSession = async () => {
    let url = '/receive-data-from-session/';

    return await fetch(url, {
        method: "GET",
        credentials: "same-origin",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": csrftoken
        },
    }).then(async (response) => {
        return response.json()
    });
}

const updatePageConfig = async (params) => {
    let url = "/update-page-config/";
    return await fetch(url, {
        method: "PUT",
        credentials: "same-origin",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": csrftoken
        },
        body: JSON.stringify(params),
    }).then( async (response) =>{
        return response.json()
    });
}

const fetchApplyFilters = async (filterData) => {
    let url = '/apply-filters/';
    return await fetch(url, {
        method: "PUT",
        credentials: "same-origin",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRFToken": csrftoken
        },
        body: JSON.stringify(filterData),
    }).then(async (response) => {
        return response.json()
    });
}

// ##### functions from filter-script #####
// Using this function, createLogRows(), from filter-script.js.
// I am able to do this because filter-script is called before this script in the html file.

// ##### Main Logic #####
// Pagination configuration
window.addEventListener("load", async () => {
    // determining if pagination is needed on the page
    let pagination = document.getElementById("pagination");
    if (!pagination) {
        pagination = document.getElementById("pagination-with-bs");
    }
    if(pagination) {
        // getting the page configs from the session
        let pageConfig = await receiveDataFromSession();
        await setPagination(pageConfig);
    }
});

function LinkClick(){
    // Onclick function on page links
    let pageLinks = document.getElementsByClassName("paginated-link");
    for(let i = 0; i < pageLinks.length; i++){
        pageLinks[i].addEventListener("click", async (e) => {
            // getting the url page param and replacing with the href from the clicked link
            // then adding the state to the url.
            let newUrl = new URL(document.URL);
            let linkHref = e.target.dataset.href.replace("?", "");
            newUrl.search = newUrl.search.replace(/page=(\d|\w)/, linkHref);
            window.history.pushState({}, "", newUrl);
            // receiving the data from the session to set a new pagination with the data
            let config = await receiveDataFromSession();
            await setPagination(config);
        });
    }
}

async function setPagination(config, filterApplied = false){
    // ##### iterating through the logs to break them up #####
    let data;
    if(filterApplied){
        data = []
        for(let i = 0; i < config["data"].length; i++){
            let set = JSON.parse(config["data"][i]);
            for(let j = 0; j < set.length; j++){
                data.push(set[j]);
            }
        }
    }
    else{
        data = typeof config["data"] === "string" ? JSON.parse(config["data"]) : config["data"];
    }

    config.data = data;
    let pages = {};
    config.pages = pages;
    let counter = 0;
    let resetCounter = false;
    let keyCount = 0
    for(let i = 0; i < data.length; i++){
        // checking to see if the counter is equal to the config amount
        if(counter === config.amount){
            resetCounter = true;
        }
        // if there aren't any keys within the pages json, then create the first set
        if(Object.keys(pages).length < 1){
            pages[keyCount + 1] = [];
            keyCount++;
        }
        // else check if the counter is equals the set amount and if the key amount is more than 0
        else if(Object.keys(pages).length > 0 && counter === config.amount){
            pages[keyCount + 1] = [];
            keyCount++;
        }
        // add the log to the correct page key array
        pages[keyCount].push(data[i]);
        // checking if the counter needs to be reset or increased
        if(resetCounter){
            counter = 1;
            resetCounter = false
        }
        else{
            counter++;
        }
    }
    // ##### updating the page configuration
    let params = [{"pages": config.pages, "data": config.data}];
    await updatePageConfig(params)

    // ##### Setting the DOM items with the pageConfig #####
    // adding the page links
    addPageLinks(config);
    // adding the paginated logs
    setData(config);
    // setURL page number
    setURL(config);
    // adding the <current page number> of <max-page counts>
    setPageCount(config)
}

function addPageLinks(config){
    const pageLinks = document.getElementById("page-numbers");
    // removing the existing links, if any
    let linkAmount = pageLinks.childElementCount;
    for(let i = 0; i < linkAmount; i++){
        pageLinks.removeChild(pageLinks.firstElementChild);
    }
    // adding the new links
    for(let i = 0; i < Object.keys(config.pages).length; i++){
        // creating a span tag
        let a = document.createElement("span");
        a.dataset.href = `?page=${i + 1}`;
        a.setAttribute("class", "paginated-link");
        a.setAttribute("role", "button");
        a.innerText = `${i + 1}`;
        pageLinks.appendChild(a);
    }

    // adding the link click functionality to the new links
    LinkClick();
}

function setData(config){
    // sets the page# links to the current-link and creates the table rows
    const tbody = document.getElementsByTagName("tbody")[0];
    let childCount = tbody.childElementCount;
    let url = new URL(document.URL);
    let paramObjects = new URLSearchParams(url.search);
    let pagination = paramObjects.has("page") ? parseInt(paramObjects.get("page")) : 1;
    let pageLinks = document.getElementsByClassName("paginated-link");
    // adding and removing the class "current-link" from the page links
    for(let i = 0; i < pageLinks.length; i++){
        let pageParam = parseInt(pageLinks[i].dataset.href.replace("?", "").split("=")[1]);
        if(pageParam === pagination){
            if(!pageLinks[i].className.includes("current-link")){
                pageLinks[i].classList.add("current-link");
            }
        }
        else if(pageParam.length < 1){
            pageLinks[0].classList.add("current-link");
        }
        else{
            if(pageLinks[i].className.includes("current-link")){
                pageLinks[i].classList.remove("current-link");
            }
        }
    }

    // removing the current logs the set amount of logs
    for(let i = 0; i < childCount; i++){
        tbody.removeChild(tbody.firstElementChild);
    }

    // adding the paginated amount
    createDataRows(config.pages, true, pagination);
}

// set the page url param
async function setURL(config){
    let url = new URL(document.URL);
    url.search = !url.search ? "?page=1": url.search;
    history.pushState({}, "", url);
    // updating the session data with the current page number
    config.current_page = parseInt(url.search.toString().match(/\d/g)[0]);
    await updatePageConfig([config]);
}

// adding the DOM information which shows 'current-num of total-num'
function setPageCount(config) {
    let currentPageSpan = document.getElementById("current-page-number");
    let maxPageSpan = document.getElementById("max-page-number");
    let pages = Object.keys(config.pages);
    // adding the info the respective spans
    currentPageSpan.innerText = config.current_page;
    maxPageSpan.innerText = `${pages.length}`;
}

// setting logs based on the Show amount
let pageAmtDrpDwn = document.getElementById("page-select");
if(pageAmtDrpDwn) {
    pageAmtDrpDwn.addEventListener("change", async () => {
        let amount = [{"amount": parseInt(pageAmtDrpDwn.value)}];
        await updatePageConfig(amount)
        let pageConfig = await receiveDataFromSession();
        await setPagination(pageConfig);
    });
}

// ##### arrow click listener functions
let arrowBtns = document.getElementsByClassName("arrow-btn");
if(arrowBtns) {
    for (let i = 0; i < arrowBtns.length; i++) {
        arrowBtns[i].addEventListener("click", async () => {
            // getting the arrow's ID
            let arrowId = arrowBtns[i].id;
            let pageConfig = await receiveDataFromSession();
            let pages = pageConfig.pages
            let url = new URL(document.URL);
            let currentPage = parseInt(url.search.replace("?page=", ""));
            // Determining if the left or right arrow was clicked
            if (arrowId === "page-left") {
                if (currentPage === 1) {
                    url.search = `?page=${Object.keys(pages).length}`;
                } else {
                    currentPage--
                    url.search = `?page=${currentPage}`;
                }
            } else {
                if (currentPage === Object.keys(pages).length) {
                    url.search = `?page=1`;
                } else {
                    currentPage++
                    url.search = `?page=${currentPage}`;
                }
            }
            // pushing the page number to the url: e.g. /?page=1
            history.pushState({}, "", url);
            // resetting the pagination
            await setPagination(pageConfig);
        });
    }
}

// ##### Creating the table rows
function createDataRows(data, pagination = false, pageNumber = 0){
    // getting all the table rows within the tbody
    let dataTrParent = document.getElementsByTagName("tbody")[0];
    let dataCount = dataTrParent.childElementCount;
    // removing the current logs
    for(let i = 0; i < dataCount; i++){
        dataTrParent.removeChild(dataTrParent.children[0]);
    }
    // adding the queried logs
    data = pagination ? data[pageNumber] : data;
    let dataArr;
    if(!pagination){
        for(let i = 0; i < data.length; i++) {
            dataArr = JSON.parse(data[i]);
        }
    }
    else{
        dataArr = data;
    }

    // this should create an array of objects containing these fields:
    // ***** If not using a Model Serializer ****************************************
    // fields <dict>: containing the Model's columns
    // model <str>: description of which model this belongs to
    // pk <str>: the primary key of this object
    // ***** If using a model serializer ********************************************
    // each table column is it's own key;
    // if a foreign key is present, the value for that column will be another object.
    // ******************************************************************************
    // getting the header columns dynamically
    let headers = document.getElementsByTagName("th");
    let tableData = []
    for(let j = 0; j < dataArr.length; j++) {
        // getting the specific dataArr item that matches with the header
        let currentRowData = dataArr[j];
        let hItem = {rowData : []};
        for (let i = 0; i < headers.length; i++) {
            // for date formatting
            let options = {
                timezone: "America/Phoenix",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
            // creating a dictionary/json mapping of the headers
            let hName = headers[i].innerText.trim(); // have to add trim() to the end because of the whitespace at the end of the dom string
            let h = headers[i].dataset.column;
            let rId = Object.keys(currentRowData).includes("pk") ? currentRowData.pk: currentRowData.id;
            let hasFormat = headers[i].dataset.format;
            let hFormat = !headers[i].dataset.format ? "" : headers[i].dataset.format;
            let hContainsDate = headers[i].dataset.containsDate;
            let item = {"columnName": hName, "columns": null, "hasMultiple": false, "textString": hFormat, "hasFK": false};
            if (h.includes(";")) {
                item.hasMultiple = true;
                item.columns = [];
                h = h.split(";");
                item.columns = h;
                // checking if any columns are foreign keys
                for(let val of item.columns){ if(val.includes(".")) item.hasFK = true }
            } else {
                item.columns = h;
                if (item.columns.includes(".")) item.hasFK = true;
            }
            if (item.hasMultiple) {
                if (item.textString) {
                    let formatOrder = hFormat.match(/-(D|\d|id)-/g);
                    for (let a = 0; a < h.length; a++) {
                        // column name
                        let column = item.columns[a];
                        if (formatOrder[a].includes("-D-")) {
                            // if variable is a date
                            let text;
                            if(item.hasFK){
                                let foreignSplit = column.split(".");
                                text = getValue(currentRowData, foreignSplit);
                            }
                            else{
                                text = currentRowData[column];
                            }
                            let date = new Date(text).toLocaleString("en-US", options);
                            item.textString = item.textString.replaceAll("-D-", date);
                        } else {
                            let text;
                            if(item.hasFK){
                                let foreignSplit = column.split(".");
                                text = getValue(currentRowData, foreignSplit);
                            }
                            else{
                                // if variable is an id or not
                                text = formatOrder[a].includes("-id-") ? rId : currentRowData[column];
                            }
                            if (formatOrder[a] === "-id-") {
                                item.textString = item.textString.replaceAll(`-id-`, text);
                            } else {
                                item.textString = item.textString.replaceAll(`-${a}-`, text);
                            }

                        }
                    }
                }
            } else {
                let text;
                if(item.hasFK){
                    let foreignSplit = item.columns.split(".");
                    text = getValue(currentRowData, foreignSplit);
                }
                else{
                    // if variable is an id or not
                    text = hName === "Id" ? rId : currentRowData[item.columns];
                }
                if (hContainsDate)
                {
                    item.textString = new Date(text).toLocaleString("en-US", options);
                } else {
                    if(hasFormat){
                        item.textString = hFormat.replaceAll(/-(D|\w|id)-/g, text)
                    }
                    else{
                        item.textString = text;
                    }
                }
            }
            // pushing the table row information to the tableData array
            hItem.rowData.push(item);
        }
        tableData.push(hItem);
    }
    for(let i = 0; i < tableData.length; i++){
        // ***** table columns(7) *****
        // creating the table row by iterating through each rowData array for the specific row
        let row = tableData[i];
        // Creating the table row dom element
        let tr = document.createElement("tr");
        tr.setAttribute("class", "data-row");
        for(let j = 0; j < row.rowData.length; j++) {
            // creating a table data element for each header column
            let td = document.createElement("td");
            td.innerHTML = row.rowData[j].textString;
            tr.appendChild(td);
        }
        // appending the table row to the tbody
        dataTrParent.appendChild(tr);
    }
}

// getting the object value, used in createDateRows function
function getValue(obj, arr){
    let currentObj = obj;
    let i = 0;
    while(typeof(currentObj) == "object"){
        currentObj = currentObj[arr[i]];
        i++;
    }
    return currentObj
}

// ########## Filter Functions ##########
let headers = document.getElementsByClassName("header-link");
let filterParams = null;
if(headers) {
    for (let i = 0; i < headers.length; i++) {
        headers[i].addEventListener("click", async () => {
            // retrieving the model
            let model = document.getElementsByTagName("table")[0].dataset.dataModel;
            // span element
            let el = headers[i];
            let currentFilter = el.dataset.currentFilter;
            // column icon classes
            let ascIcon = "fa-arrow-down-short-wide";
            let descIcon = "fa-arrow-up-wide-short";
            // icon classlist
            let elIconClasses = el.children[0].classList;
            // retrieve the param data from the dataset
            let params = {
                model: model,
                filter: el.dataset.filterBy,
                direction: !el.dataset.direction ? 'desc' : el.dataset.direction, // making this 'desc' will ensure the data is ordered by asc; view ipa/models/queries.py - Queries.get_filtered_data
            }
            filterParams = params;

            // changing data-current-filter property and icon
            if (currentFilter === "false" || !currentFilter) {
                for (let j = 0; j < headers.length; j++) {
                    let otherCol = headers[j];

                    if (otherCol.dataset.currentFilter === "true") {
                        otherCol.dataset.currentFilter = "false";
                        let otherClasses = otherCol.children[0].classList;
                        otherClasses.remove(otherClasses[1]);
                        break;
                    }
                }
                el.dataset.currentFilter = "true";
                elIconClasses.add(ascIcon);
                el.dataset.direction = "asc";
                // if the header already has a direction, change it to desc if it isn't already
                params.direction = "desc";
            } else {
                // change the icon direction
                if (params.direction === "asc") {
                    elIconClasses.remove(ascIcon);
                    elIconClasses.add(descIcon);
                    el.dataset.direction = "desc";
                } else {
                    elIconClasses.remove(descIcon);
                    elIconClasses.add(ascIcon);
                    el.dataset.direction = "asc";
                }
            }

            // calling fetchApplyFilters and storing the response
            let filterResponse = await fetchApplyFilters(filterParams);
            // setting the data
            await setPagination(filterResponse);
        });
    }
}