// GENERIC

function clone(x) {
    return JSON.parse(JSON.stringify(x))
}

function wrap(list, index) {
    return (index + list.length) % list.length
}
    


function isBright(ref) {
    const yiq = ((ref.r*299)+(ref.g*587)+(ref.b*114))/1000
    return (yiq >= 128)
}

function replaceRecursive(node, data) {
    for (let i in node.childNodes){
        const childNode = node.childNodes[i]
        if (childNode.nodeType === Node.TEXT_NODE) {
            Object.keys(data).forEach(key => {
                var rx = new RegExp(`\{\{\s*${key}\s*\}\}`, 'g')
                childNode.nodeValue = childNode.nodeValue.replace(rx, data[key])
            })
        } else {
            replaceRecursive(childNode, data)
        }
    }
}
function makeFromTemplate(template, data) {
    var clone = template.content.cloneNode(true)
    replaceRecursive(clone, data)
    return clone
}

function retrieveElement(el, root) {
    if (typeof el === "string") {
        root = root || document.body
        return root.querySelector(el)
    }
    return el
}

export const GALLERY = "gallery"
export const ABOUT = "about"
export const FILTER = "filter"
export const DETAIL = "detail"

const defaultState = {
    view: GALLERY,
    hash: '',
    color: {r:0, g:0, b:0},
    tags: [],
    filters: [],
    list: []
}

const defaultOpts = {
    templateData: {},
    headerTemplate: '#header-template',
    contentTemplate: '#content-template',
    aboutTemplate: '#about-template',
    rootElement: document.body,
    logoElement: '.logo',
    aboutButton: '.about-button',
    filterButton: '.filter-button',
    galleryButton: '.gallery-button',
    infoElement: '.info',
    backButton: '.back-button',
    contentContainer: '.content',
}

export class ImageGallery {
    constructor (data, opts = {}) {
        console.log("%cThe hopefully well behaving image gallery.",'font-weight: bold;')
        console.log(`I am happy to show you the internals.`)
        console.log('https://github.com/emiolechi/photography')
        opts = {...defaultOpts, ...opts}
        // hammer.hs is not imported by this module. Passing as opts possible.
        this.Hammer = Hammer || opts.Hammer 
        this.data = data
        this.viewCache = new Map()
        this.viewGenerators = new Map()
        this.viewGenerators.set(DETAIL, ()=>{return this.makeDetail()})
        this.viewGenerators.set(GALLERY, ()=>{return this.makeGallery()})
        this.viewGenerators.set(ABOUT, ()=>{return this.makeAbout()})
        this.viewGenerators.set(FILTER, ()=>{return this.makeFilter()})

        this.currentState = clone(defaultState)
        this.templateData = opts.templateData || {}

        this.rootElement = retrieveElement(opts.rootElement)

        this.headerTemplate = retrieveElement(opts.headerTemplate, this.rootElement)
        this.contentTemplate = retrieveElement(opts.contentTemplate, this.rootElement)
        this.aboutTemplate = retrieveElement(opts.aboutTemplate, this.rootElement)

        this.makeApplication(opts)
        this.readState()
        this.applyState()

        window.addEventListener('popstate', (event) => {
            const state = event.state || clone(defaultState)
            this.currentState = state
            this.applyState()
        })
    }

    makeApplication(opts) {
        this.header = this.makeHeader()
        this.content = this.makeContent()
        this.rootElement.append(this.header)
        this.rootElement.append(this.content)


        this.contentContainer = retrieveElement(opts.contentContainer)
        this.logoElement = retrieveElement(opts.logoElement)
        this.aboutButton = retrieveElement(opts.aboutButton)
        this.filterButton = retrieveElement(opts.filterButton)
        this.galleryButton = retrieveElement(opts.galleryButton)
        this.infoElement = retrieveElement(opts.infoElement)
        this.backButton = retrieveElement(opts.backButton)

        this.logoElement.classList.remove("hidden")

        this.makeNavigation()
    }

    makeHeader() {
        return makeFromTemplate(this.headerTemplate, this.templateData)
    }
    makeContent() {
        return makeFromTemplate(this.contentTemplate, this.templateData)
    }

    readState() {
        const urlParams = new URLSearchParams(window.location.search)
        const name = urlParams.get('name')
        if (name) this.currentState.name = name
        const hashStr = urlParams.get('hash')
        if (hashStr) this.currentState.hash = hashStr
        const view = urlParams.get('view')
        if ([GALLERY, ABOUT, DETAIL, FILTER].indexOf(view) != -1) this.currentState.view = view
        const filtersStr = urlParams.get('filters')
        const filtersArr = filtersStr?filtersStr.split(','):[]
        this.currentState.tags = filtersArr.filter(value => this.data.tags.hasOwnProperty(value) != -1)
    }

    saveState() { 
        const url = new URL(window.location)
        url.searchParams.set('filters', this.currentState.tags)
        url.searchParams.set('view', this.currentState.view)
        url.searchParams.set('hash', this.currentState.hash)
        const currentParams = new URLSearchParams()
        if (url.search!==window.location.search) {
            window.history.pushState(
                clone(this.currentState), 
                '', 
                url
            )
        }
    }

    applyState() {
        this.applyFilters()
        this.show(this.currentState.view)
    }


    getIndexOfHash() {
        let i = 0
        for (i; i<this.currentState.list.length; i++) {
            if (this.currentState.list[i].hash === this.currentState.hash) break;
        }
        return i
    }



    navigate(view, opts) {
        this.currentState = {...this.currentState, ...opts, ...{view}}
        this.saveState()
        this.show(view, opts)
    }

    invalidate(view) {
        if (this.viewCache.has(view)) {
            const elem = this.viewCache.get(view)
            if (typeof elem.destroy === 'function') {
                elem.destroy()
            }
            this.viewCache.delete(view)
        }
    }


    show(view, opts) {
        this.clearContent()
        if (this.viewCache.has(view)) {
            this.appendContent(this.viewCache.get(view)) 
        } else if (this.viewGenerators.has(view)) {
            const elem = this.viewGenerators.get(view)(opts)
            if (!elem.noCache) this.viewCache.set(view, elem)
            this.appendContent(elem)
        }
        this.updateNavi()
    }


    appendContent(elem) {
        this.contentContainer.append(elem) 
        if (typeof elem.attach === 'function') {
            elem.attach()
        }
    }

    clearContent() {
        while(this.contentContainer.firstChild) {
            const el = this.contentContainer.firstChild
            if (el.noCache) {
                if (typeof el.destroy === 'function') {
                    el.destroy()
                }
            } else {

                if (typeof el.detach === 'function') {
                    el.detach()
                }
            }
            this.contentContainer.removeChild(el)
        }
    }
    
    updateColors() {
        const ref = this.currentState.color
        Array.from(document.querySelectorAll(".colorize")).forEach(elem => {
            elem.style.backgroundColor = null
            elem.style.color = null
        })
        Array.from(document.querySelectorAll(".colorize.active")).forEach(elem => {
            elem.style.backgroundColor = `rgba(${ref.r},${ref.g},${ref.b},0.9)`
            elem.style.color = isBright(ref)?'#121009':'#FCFAF9'
        })
        Array.from(document.querySelectorAll(".colorize.always-active")).forEach(elem => {
            elem.style.backgroundColor = `rgba(${ref.r},${ref.g},${ref.b},0.9)`
            elem.style.color = isBright(ref)?'#121009':'#FCFAF9'
        })

    }
    
    attachButtonLogic(elem, cb) {
        const mc = new this.Hammer.Manager(elem, {})
        mc.add(new this.Hammer.Tap())
        mc.on("tap", cb)
    }
    
    makeNavigation() {
        this.attachButtonLogic(this.aboutButton, () => {this.navigate(ABOUT)})
        this.attachButtonLogic(this.galleryButton, () => {this.navigate(GALLERY)})
        this.attachButtonLogic(this.filterButton, () => {this.navigate(FILTER)})
        this.attachButtonLogic(this.backButton, () => {this.navigate(GALLERY)})
    }

    useDefaultNavigation() {
        this.aboutButton.classList.remove("hidden")
        this.backButton.classList.add("hidden")
        this.infoElement.classList.add("hidden")
        this.galleryButton.classList.remove("hidden")
        this.filterButton.classList.remove("hidden")
        this.logoElement.classList.remove("hidden")
    }

    useModalNavgation() {
        this.aboutButton.classList.add("hidden")
        this.backButton.classList.remove("hidden")
        this.infoElement.classList.remove("hidden")
        this.galleryButton.classList.add("hidden")
        this.filterButton.classList.add("hidden")
        this.logoElement.classList.remove("hidden")
    }

    removeActive() {
        this.aboutButton.classList.remove("active")
        this.backButton.classList.remove("active")
        this.infoElement.classList.remove("active")
        this.galleryButton.classList.remove("active")
        this.filterButton.classList.remove("active")
    }

    updateNavi() {
        this.removeActive() 
        switch (this.currentState.view) {
            case DETAIL:
                this.useModalNavgation()
                break
            case GALLERY:
                this.useDefaultNavigation()
                this.galleryButton.classList.add("active")
                break
            case FILTER:
                this.useDefaultNavigation()
                this.filterButton.classList.add("active")
                break
            case ABOUT:
                this.useDefaultNavigation()
                this.aboutButton.classList.add("active")
                break
        }
        this.updateColors()
    }

    applyFilters() {
        this.currentState.list = this.data.list.filter(image => {
            let fail = false
            this.currentState.tags.forEach(filter => {
                if (image.tags.indexOf(filter) == -1) fail = true
            })
            return !fail
        })
        if (!this.currentState.list.length) {
            // empty list
            this.currentState.tags = []
            this.currentState.list = [...data.list]
        }
        this.currentState.list = this.currentState.list.sort((a,b)=>{return a.name < b.name ? -1 : 1;})
        this.currentState.filters = Array.from(new Set(this.currentState.list.map(image => image.tags).flat().sort()))
        this.invalidate(GALLERY)
        this.invalidate(FILTER)
        if (this.currentState.list.length) {
            let hashIndex = this.currentState.list.findIndex(image => image.hash === this.currentState.hash)
            if (hashIndex == -1) hashIndex = 0
            this.currentState.hash = this.currentState.list[hashIndex].hash
            this.currentState.color = this.currentState.list[hashIndex].dominantColor
        }
        this.updateColors()
    }

    // ABOUT

    makeAbout() {
        const aboutContainer = document.createElement('section')
        aboutContainer.classList.add("about")
        aboutContainer.append(makeFromTemplate(this.aboutTemplate, this.templateData))
        const onKeyDown = (event) => {
            const key = event.key
            switch (key) {
                case "Esc": // IE/Edge specific value
                case "Escape":
                    navigate(GALLERY)
                    break
            }
        }
        aboutContainer.attach = () => {
            this.rootElement.addEventListener('keydown', onKeyDown)
        }
        aboutContainer.detach = () => {
            this.rootElement.removeEventListener('keydown', onKeyDown)
            }

        return aboutContainer
    }


    makeSpinner(ref, cls) {
        const elem = document.createElement('div')
        elem.classList.add('spinner')
        elem.classList.add(...cls)
        const front = document.createElement('div')
        front.classList.add('front')
        const back = document.createElement('div')
        back.classList.add('back')
        back.style.backgroundColor = `rgba(${ref.r},${ref.g},${ref.b},.9)`
        elem.append(back,front)
        return elem
    }

    
    makeDetailLoader(color) {
        return this.makeSpinner(color, ["large", "delay-in"])
    }

    makeGalleryLoader(color) {
        const loaderContainer = document.createElement('div')
        loaderContainer.classList.add("loader-container")
        loaderContainer.appendChild(this.makeSpinner(color, ["small", "delay-0"]))
        loaderContainer.appendChild(this.makeSpinner(color, ["small", "delay-1"]))
        loaderContainer.appendChild(this.makeSpinner(color, ["small", "delay-2"]))
        loaderContainer.destroy = () => {}
        return loaderContainer
    }

    // GALLERY

    makeGallery() {
        const list = this.currentState.list
        const galleryContainer = document.createElement("section")
        galleryContainer.classList.add("gallery")

        const loaderContainer = this.makeGalleryLoader(this.currentState.color)

        let loading = 0
        let index = 0
        let galleryScrollPos = 0
        const junkSize = 10
        const loadThreshold = 50
        let junkElems = []
        const imageComplete = () => {
            if (--loading <= 0) junkComplete()
        }
        const junkComplete = () => {
            loaderContainer.remove()
            junkElems.forEach(imgElem => {
                galleryContainer.append(imgElem)
                setTimeout(()=>{
                    if (imgElem) {
                        imgElem.style.transition = "opacity ease-in 0.5s";
                        imgElem.style.opacity = 1.0
                    }
                }, 10)
            })
            junkElems = []
            loading = 0
            if (galleryContainer.scrollTop + galleryContainer.offsetHeight >= galleryContainer.scrollHeight - loadThreshold) {
                loadNextJunk()
            }
        }
        const loadNextJunk = () => {
            if (loading) {
                return
            }
            const limit = index+Math.min(list.length-index, junkSize)
            if (index < limit) {
                galleryContainer.append(loaderContainer)
                for (index; index<limit; index++) {
                    loading++
                    const image = list[index]
                    const imgElem = document.createElement("img")
                    imgElem.classList.add("thumbnail")
                    imgElem.setAttribute('draggable', 'false')
                    imgElem.ondragstart = () => false
                    imgElem.hash = image.hash
                    imgElem.style.opacity = 0.0
                    imgElem.addEventListener("load", imageComplete)
                    imgElem.addEventListener("error", imageComplete)
                    imgElem.src = image.thumbnail
    
                    const mc = new this.Hammer.Manager(imgElem, {})
                    mc.add(new this.Hammer.Tap())
                    mc.on("tap", (ev)=>{
                        this.navigate(DETAIL, {hash: imgElem.hash})
                    })
                    imgElem.destroy = () => {
                        imgElem.removeEventListener("load", imageComplete)
                        imgElem.removeEventListener("error", imageComplete)
                        mc.destroy()
                        imgElem.src = ''
                    }
                    junkElems.push(imgElem)
                    
                }
            }
        }
        loadNextJunk()
        const onScroll = (ev) => {
            if (galleryContainer.scrollTop + galleryContainer.offsetHeight >= galleryContainer.scrollHeight - loadThreshold) {
                loadNextJunk()
            }
            galleryScrollPos = galleryContainer.scrollTop
        }
        galleryContainer.attach = () => {
            if (galleryScrollPos) galleryContainer.scrollTop = galleryScrollPos
            galleryContainer.addEventListener("touchmove", onScroll)
            galleryContainer.addEventListener("scroll", onScroll)
        }
        galleryContainer.detach = () => {
            galleryContainer.removeEventListener("touchmove", onScroll)
            galleryContainer.removeEventListener("scroll", onScroll)
        }
        galleryContainer.destroy = () => {
            Array.from(galleryContainer.children).forEach(child => child.destroy())
        }
        return galleryContainer
    }


    // DETAIL

    makeDetail() {
        let list = this.currentState.list
        let index = this.getIndexOfHash(this.currentState.hash)
        index = wrap(list, index)

        this.currentState.color = list[index].dominantColor
        this.updateColors()

        const detailContainer = document.createElement("section")
        detailContainer.classList.add("detail")
        
        const imgContainer = document.createElement("div")
        imgContainer.classList.add("image-container")

        detailContainer.append(imgContainer)

        const animateThreshold = .001
        const animateFactor = .167
        const gcThreshold = 15
        const gcLimit = 10
        const swipeThreshold = .167
        const imagePreloadCycles = 2 // images per side (left & right)
        let offset = -imagePreloadCycles
        let panTarget = offset
        let panOffset = 0
        this.infoElement.innerText = `${list[index].name}`

        const mc = new this.Hammer.Manager(detailContainer, {})
        

        const makeImage = (list, index, initPosition) => {
            initPosition = initPosition || 0
            const image = list[index]
            const container = document.createElement("div")
            container.classList.add("image-group")
            container.position = -1
            container.updatePosition = () => {
                container.style.left = `${container.position*100}%`
                container.style.top = `${0}%`
                if (container.position == -1 || container.position == 1) container.resetTransform()
            }

            const imgElem = document.createElement("img")
            imgElem.style.opacity = 0
            imgElem.setAttribute('loading', 'eager')
            imgElem.classList.add("image")

            const loaderElem = this.makeDetailLoader(image.dominantColor)
            container.append(loaderElem)
            const onLoad = (ev) => {
                loaderElem.remove()
                container.append(imgElem)
                setTimeout(()=>{
                    if (imgElem) {
                        imgElem.style.transition = "opacity ease-in 0.5s";
                        imgElem.style.opacity = 1.0
                    }
                }, 10)
            }
            imgElem.addEventListener("load", onLoad)
            imgElem.src = image.src
            container.index = index

            let origin = {x:0, y:0}
            const defaultTransform = {
                isDefault: true,
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0
            }
            let transform = {...defaultTransform}
            container.setOrigin = (x, y) => {
                origin.x = x
                origin.y = y
                imgElem.style.transformOrigin = `${origin.x}px ${origin.y}px`
            }
            container.getOrigin = () => {
                return {x:origin.x, y:origin.y}
            }
            container.setTransform = (value) => {
                transform = {...transform, ...value, ...{isDefault: false}}
                imgElem.style.transition = "unset"
                imgElem.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`
            }
            container.getTransform = () => {
                return {...transform}
            }
            container.resetTransform = (animated) => {
                if (transform.isDefault) return
                transform = {...defaultTransform}
                if (animated) imgElem.style.transition = "transform ease-in-out 0.5s"
                else imgElem.style.transition = "unset"
                imgElem.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`
            }
            container.destroy = () => {
                imgElem.removeEventListener("load", onLoad)
                imgElem.src = ''
                imgElem.onload = null
                imgElem.onerror = null
                imgElem.remove()
            }

            container.updatePosition()
            return container
        }

        const preload = () => {
            // optimized ping pong load order
            let order = [makeImage(list, wrap(list, index), calcImagePosition(index))]
            for (let i = 1; i<=imagePreloadCycles; i++) {
                order.push(makeImage(list, wrap(list, index+i)))
                order.unshift(makeImage(list, wrap(list, index-i)))
            }
            imgContainer.append(...order)
            updatePosition()
        }

        const calcImagePosition = (index) => {
            return Math.min(1, Math.max(-1, index + offset + panOffset))
        }

        const updatePosition = () => {
            Array.from(imgContainer.children).forEach((child, index) => {
                let newPos = calcImagePosition(index)
                if (child.position != newPos) {
                    child.position = newPos
                    child.updatePosition()
                }
            })
        }
        mc.add([
            new this.Hammer.Tap,
            new this.Hammer.Pinch(), 
            new this.Hammer.Pan({direction: this.Hammer.DIRECTION_HORIZONTAL, threshold: 15})
        ])
        let relCenter = {x:0, y:0}
        let relRotation = 0
        let imgTransform
        mc.on("pinchstart", (ev)=>{
            relCenter = ev.center
            relRotation = ev.rotation
            let currentImg = imgContainer.children[Math.round(-offset)]
            if(currentImg) { 
                imgTransform = currentImg.getTransform()
            }
        })
        mc.on("pinchmove", (ev)=>{
            let currentImg = imgContainer.children[Math.round(-offset)]
            if(currentImg) { 
                currentImg.setTransform({
                    scale: Math.max(.5, Math.min(5, imgTransform.scale * ev.scale)),
                    x: imgTransform.x + (ev.center.x-relCenter.x ),
                    y: imgTransform.y + (ev.center.y- relCenter.y ),
                    rotation:  imgTransform.rotation + (ev.rotation - relRotation),
                })
            }
        })
        mc.on("pinchend", (ev)=>{

        })

        mc.on("tap", (ev)=>{
            let currentImg = imgContainer.children[Math.round(-offset)]
            if(currentImg) { 
                currentImg.resetTransform(true)
            }
        })

        mc.on("panstart", (ev)=>{
            panOffset = 0
            updatePosition()
        })

        mc.on("panmove", (ev)=>{
            const w = imgContainer.getBoundingClientRect().width
            panOffset = ev.deltaX/w
            updatePosition()
        })

        mc.on("panend", (ev)=>{
            if (panOffset < -swipeThreshold) {
                panTarget = Math.round(offset - 1)
                index = wrap(list, index + 1)
                loadRight()
            } else if (panOffset > swipeThreshold) {
                panTarget = Math.round(offset + 1)
                index = wrap(list, index - 1)
                loadLeft()
            } else {
                panTarget = Math.round(offset)
            }
            offset += panOffset
            panOffset = 0
            this.infoElement.innerText = `${list[index].name}`
            this.currentState.hash = list[index].hash
            this.currentState.color = list[index].dominantColor
            this.updateColors()  
            this.saveState()
            animate()
        })

        const animate = () => {
            requestAnimationFrame(()=>{
                const delta = panTarget - offset
                if (delta > animateThreshold || delta < -animateThreshold){
                    offset += delta * animateFactor
                    updatePosition()
                    animate()
                } else {
                    offset = panTarget
                    updatePosition()
                    gc()
                }
            })
        }

        const loadLeft = () => {
            while (offset >= -imagePreloadCycles) {
                imgContainer.prepend(
                    makeImage(
                        list, 
                        wrap(list,imgContainer.children[0].index-1)
                    )
                )
                offset--
                panTarget--
            }
            updatePosition()
        }
        const loadRight = () => {
            while (offset <= -(imgContainer.children.length-1-imagePreloadCycles)) {
                imgContainer.append(
                    makeImage(
                        list, 
                        wrap(list,imgContainer.children[imgContainer.children.length-1].index+1)
                    )
                )
            }
            updatePosition()
        }

        const gc = () => {
            if (imgContainer.children.length >= gcThreshold) {
                const removeFromStart = offset <= gcLimit - gcThreshold
                while (imgContainer.children.length >= gcLimit) {
                    let child
                    if (removeFromStart) {
                        child = imgContainer.children[0]
                        offset++
                        panTarget++
                    } else {
                        child = imgContainer.children[imgContainer.children.length-1]
                    }
                    child.destroy()
                    imgContainer.removeChild(child)
                }
            }
            updatePosition()
        }
        const onKeyDown = (event) => {
            const key = event.key // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
            switch (key) {
                case "Left": // IE/Edge specific value
                case "ArrowLeft":
                    panTarget = Math.round(offset + 1)
                    index = wrap(list, index - 1)
                    this.infoElement.innerText = `${list[index].name}`
                    this.currentState.hash = list[index].hash
                    this.currentState.color = list[index].dominantColor
                    this.updateColors()
                    this.saveState()
                    loadLeft()
                    animate()
                    break;
                case "Right": // IE/Edge specific value
                case "ArrowRight":
                    panTarget = Math.round(offset - 1)
                    index = wrap(list, index + 1)
                    this.infoElement.innerText = `${list[index].name}`
                    this.currentState.hash = list[index].hash
                    this.currentState.color = list[index].dominantColor
                    this.updateColors()
                    this.saveState()
                    loadRight()
                    animate()
                    break;
                case "Esc": // IE/Edge specific value
                case "Escape":
                    this.navigate(GALLERY)
                    break;
            }
        }
        this.rootElement.addEventListener('keydown', onKeyDown)
        detailContainer.destroy = () => {
            this.rootElement.removeEventListener('keydown', onKeyDown)
            mc.destroy()
            while (imgContainer.firstChild) {
                imgContainer.firstChild.destroy()
                imgContainer.removeChild(imgContainer.firstChild)
            }
        }
        detailContainer.noCache = true
        preload()
        return detailContainer
    }



    // FILTER

    makeFilter() {
        const fllen = this.currentState.list.length
        const fllenStr = fllen==0?"no":fllen
        const imageStr = fllen<=1?'image':'images'
        this.infoElement.innerText = `${fllenStr} ${imageStr} found`
        const filterContainer = document.createElement("section")
        filterContainer.classList.add("filters")
        const selectionContainer = document.createElement("section")
        selectionContainer.classList.add("selection")
        const selectionHeadline = document.createElement("h2")
        selectionHeadline.innerText = "Selected filters"
        selectionContainer.appendChild(selectionHeadline)
        const optionsContainer = document.createElement("section")
        const optionsHeadline = document.createElement("h2")
        optionsHeadline.innerText = "Possible filters"
        optionsContainer.appendChild(optionsHeadline)
        optionsContainer.classList.add("options")
        this.currentState.filters.forEach((filter) => {
            const meta = this.data.tags[filter]
            const filterElem = document.createElement("button")
            filterElem.classList.add("filter")
            const mc = new this.Hammer.Manager(filterElem, {})
            mc.add(new this.Hammer.Tap()) 
            mc.on("tap", (ev)=>{
                const filterindex = this.currentState.tags.indexOf(filter)
                if (filterindex != -1) {
                    this.currentState.tags.splice(filterindex,1)
                } else {
                    this.currentState.tags.push(filter)
                }
                this.applyFilters()
                this.navigate(FILTER)
            })
            filterElem.destroy = () => {
                mc.destroy()
            }
            filterElem.innerText = `${filter}`
            filterElem.style.backgroundColor = `rgba(${meta.dominantColor.r},${meta.dominantColor.g},${meta.dominantColor.b},.9)`
            filterElem.style.color = isBright(meta.dominantColor)?'black':'white'
            if (this.currentState.tags.indexOf(filter) != -1) {
                filterElem.classList.add("selected")
                selectionContainer.append(filterElem)
            } else {
                optionsContainer.append(filterElem)
            }
            if (this.currentState.tags.length) filterContainer.appendChild(selectionContainer)
            if (this.currentState.tags.length - this.currentState.filters.length) filterContainer.appendChild(optionsContainer)
        })
        const onKeyDown = (event) => {
            const key = event.key
            switch (key) {
                case "Esc": // IE/Edge specific value
                case "Escape":
                    this.navigate(GALLERY)
                    break
            }
        }
        filterContainer.attach = () => {
            this.rootElement.addEventListener('keydown', onKeyDown)
        }
        filterContainer.detach = () => {
            this.rootElement.removeEventListener('keydown', onKeyDown)
        }
        filterContainer.destroy = () => {
            while(selectionContainer.firstChild) {
                const el = selectionContainer.firstChild
                if (typeof el.destroy === 'function') {
                    el.destroy()
                }
                selectionContainer.removeChild(el)
            }
            while(optionsContainer.firstChild) {
                const el = optionsContainer.firstChild
                if (typeof el.destroy === 'function') {
                    el.destroy()
                }
                optionsContainer.removeChild(el)
            }
        }
        return filterContainer
    }

}

export function load(src) {
    return fetch(src).then(response => response.json())
}


