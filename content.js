console.log("Content script loaded.")

let checkpointHistory = []

const storageKey = "yahtzeeCheckpoints"
const downloadFilename = "yahtzeeCheckpoints"

const tableSelector = "#scorecard"
const messageSelector = "#messageBox"
const totalSelector = "#total-score"

chrome.storage.local.get([storageKey], (result) => {
    console.log("Existing checkpoint histories: ", result[storageKey])
})


function logCheckpoint(table) {
    const tableRows = table.querySelectorAll('tr')
    let checkpoint = []

    tableRows.forEach((tableRow, _) => {
        const cells = tableRow.querySelectorAll('th, td')
        if (cells.length >= 3) {
            checkpoint.push(tableRow.cells[2].textContent.trim())
        }
    })

    if (JSON.stringify(checkpoint) == JSON.stringify(checkpointHistory[checkpointHistory.length - 1])) return;

    checkpointHistory.push(checkpoint)
    console.log("Logged checkpoint ", checkpoint)
}

function appendToStorageArray(key, array) {
    chrome.storage.local.get([key], (result) => {
        let existingArray = result[key] || []

        existingArray = existingArray.concat(array)

        chrome.storage.local.set({ [key]: existingArray }, () => {
            console.log("Array updated successfully:", existingArray)
        })
    })
}

function downloadCheckpointHistories() {
    chrome.storage.local.get([storageKey], (result) => {
        histories = result[storageKey]
        csvHistories = histories.map(row => row.join(',')).join('\n');

        const blob = new Blob([csvHistories], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = downloadFilename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    })
}

function saveCallback() {
    if (checkpointHistory.length > 0) {
        let totalNode = document.querySelector(totalSelector)
        const finalScore = totalNode.cells[2].textContent.trim()

        checkpointHistory.forEach((dataRow, rowIdx) => {
            let newRow = dataRow
            newRow[16] = finalScore
            checkpointHistory[rowIdx] = newRow
        })

        console.log("This game's checkpoint history: ", checkpointHistory)
        appendToStorageArray(storageKey, checkpointHistory)

        chrome.storage.local.get([storageKey], (result) => {
            console.log("Overall checkpoint history: ", result[storageKey])
        })

        downloadCheckpointHistories()
        checkpointHistory = []
    }
}

function checkpointCallback(mutationsList) {
    for (const mutation of mutationsList) {
        let messageNode = document.querySelector(messageSelector)
        const paragraphs = messageNode.querySelectorAll('p')
        paragraphs.forEach(pElement => {
            if (pElement.textContent == "") {
                let tableNode = document.querySelector(tableSelector)
                logCheckpoint(tableNode)
            }
        })
    }
}

function observeTarget(selector, callback) {
    let targetNode = document.querySelector(selector)

    if (targetNode) {
        console.log("Target element found:", targetNode)

        const observer = new MutationObserver(callback)

        const config = {
            attributes: true,
            childList: true,
            subtree: true
        }

        observer.observe(targetNode, config)
        console.log("Started observing:", selector)
    } else {
        console.warn("Target element not found. Watching for DOM changes...")
        waitForTarget(selector)
    }
}

function waitForTarget(selector) {
    const observer = new MutationObserver(() => {
        let targetNode = document.querySelector(selector)
        if (targetNode) {
            observer.disconnect()
            observeTarget()
        }
    })

    observer.observe(document.body, { childList: true, subtree: true })
}

observeTarget(messageSelector, checkpointCallback)
observeTarget(totalSelector, saveCallback)
