(function(){

    console.log("Welcome to my hopefully well behaving Image Gallery")

    // GENERIC

    function clone(x) {
        return JSON.parse(JSON.stringify(x))
    }

    function wrap(list, index) {
        return (index + list.length) % list.length
    }
      
    function attachButtonLogic(elem, cb) {
        const mc = new Hammer.Manager(elem, {})
        mc.add(new Hammer.Tap())
        mc.on("tap", cb)
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

    function makeApp(data) {
        const GALLERY = "gallery"
        const ABOUT = "about"
        const FILTER = "filter"
        const DETAIL = "detail"

        const infoElem = document.querySelector('.info')
        const contentContainer = document.querySelector(".content")
        const filterButton = document.querySelector('.filter-button')
        const galleryButton = document.querySelector('.gallery-button')
        const backButton = document.querySelector('.back')
        const logoEl = document.querySelector('.logo')


        const aboutTemplate = document.querySelector('#about-template');


        const viewCache = new Map()
        const viewGenerators = new Map()

        const defaultState = {
            view: GALLERY,
            hash: '',
            color: {r:0, g:0, b:0},
            name: data.names[0],
            tags: [],
            filters: [],
            list: []
        }

        let currentState = clone(defaultState)

        function initialize() {
            console.log(`My name is ${currentState.name} and I am happy to welcome you within the internals.`)
            readState()
            makeNavigation()
            applyState()
            document.querySelector('.logo').classList.remove("hidden")
            window.addEventListener('popstate', (event) => {
                const state = event.state || clone(defaultState)
                currentState = state
                applyState()
            })
        }

        function readState() {
            const urlParams = new URLSearchParams(window.location.search)
            const name = urlParams.get('name')
            if (name) currentState.name = name
            const hashStr = urlParams.get('hash')
            if (hashStr) currentState.hash = hashStr
            const view = urlParams.get('view')
            if ([GALLERY, ABOUT, DETAIL, FILTER].indexOf(view) != -1) currentState.view = view
            const filtersStr = urlParams.get('filters')
            const filtersArr = filtersStr?filtersStr.split(','):[]
            currentState.tags = filtersArr.filter(value => data.tags.hasOwnProperty(value) != -1)
        }

        function saveState() { 
            const url = new URL(window.location)
            url.searchParams.set('filters', currentState.tags)
            url.searchParams.set('view', currentState.view)
            url.searchParams.set('hash', currentState.hash)
            const currentParams = new URLSearchParams()
            if (url.search!==window.location.search) {
                window.history.pushState(
                    clone(currentState), 
                    '', 
                    url
                )
            }
        }

        function applyState() {
            applyFilters()
            updateName()
            show(currentState.view)
        }


        function getIndexOfHash() {
            let i = 0
            for (i; i<currentState.list.length; i++) {
                if (currentState.list[i].hash === currentState.hash) break;
            }
            return i
        }

        function updateName() {
            logoEl.innerText = currentState.name
            document.title = `${currentState.name} - Photography`
        }

        function randomizeName() {
            currentState.name = data.names[Math.floor(Math.random()*data.names.length)]
            invalidate(ABOUT)
            updateName()
            if (currentState.view === ABOUT) show(ABOUT)
        }


        function navigate(view, opts) {
            currentState = {...currentState, ...opts, ...{view}}
            saveState()
            show(view, opts)
        }

        function invalidate(view) {
            if (viewCache.has(view)) {
                const elem = viewCache.get(view)
                if (typeof elem.destroy === 'function') {
                    elem.destroy()
                }
                viewCache.delete(view)
            }
        }

        function show(view, opts) {
            clearContent()
            if (viewCache.has(view)) {
                appendContent(viewCache.get(view)) 
            } else if (viewGenerators.has(view)) {
                const elem = viewGenerators.get(view)(opts)
                if (!elem.noCache) viewCache.set(view, elem)
                appendContent(elem)
            }
            updateNavi()
        }


        function appendContent(elem) {
            contentContainer.append(elem) 
            if (typeof elem.attach === 'function') {
                elem.attach()
            }
        }

        function clearContent() {
            while(contentContainer.firstChild) {
                const el = contentContainer.firstChild
                if (el.noCache) {
                    if (typeof el.destroy === 'function') {
                        el.destroy()
                    }
                } else {

                    if (typeof el.detach === 'function') {
                        el.detach()
                    }
                }
                contentContainer.removeChild(el)
            }
        }
        
        function updateColors() {
            const ref = currentState.color
            Array.from(document.querySelectorAll(".colorize")).forEach(elem => {
                elem.style.backgroundColor = null
                elem.style.color = null
            })
            Array.from(document.querySelectorAll(".colorize.active")).forEach(elem => {
                elem.style.backgroundColor = `rgba(${ref.r},${ref.g},${ref.b},0.9)`
                if(elem.classList.contains('complementary-text')) {
                    elem.style.color = isBright(ref)?'#121009':'#FCFAF9'
                }
            })

        }


        function makeNavigation() {
            attachButtonLogic(logoEl, () => {randomizeName();navigate(ABOUT)})
            attachButtonLogic(galleryButton, () => {navigate(GALLERY)})
            attachButtonLogic(filterButton, () => {navigate(FILTER)})
            attachButtonLogic(galleryButton, () => {navigate(GALLERY)})
            attachButtonLogic(backButton, () => {navigate(GALLERY)})
        }

        function useDefaultNavigation() {
            backButton.classList.add("hidden")
            infoElem.classList.add("hidden")
            galleryButton.classList.remove("hidden")
            filterButton.classList.remove("hidden")
        }

        function useModalNavgation() {
            backButton.classList.remove("hidden")
            infoElem.classList.remove("hidden")
            galleryButton.classList.add("hidden")
            filterButton.classList.add("hidden")
        }

        function removeActive() {
            backButton.classList.remove("active")
            infoElem.classList.remove("active")
            galleryButton.classList.remove("active")
            filterButton.classList.remove("active")
        }

        function updateNavi() {
            removeActive() 
            switch (currentState.view) {
                case DETAIL:
                    useModalNavgation()
                    break
                case GALLERY:
                    useDefaultNavigation()
                    galleryButton.classList.add("active")
                    break
                case FILTER:
                    useDefaultNavigation()
                    filterButton.classList.add("active")
                    break
                case ABOUT:
                    useDefaultNavigation()
                    break
            }
            updateColors()
        }

        function applyFilters() {
            currentState.list = data.list.filter(image => {
                let fail = false
                currentState.tags.forEach(filter => {
                    if (image.tags.indexOf(filter) == -1) fail = true
                })
                return !fail
            })
            if (!currentState.list.length) {
                // empty list
                currentState.tags = []
                currentState.list = [...data.list]
            }
            currentState.list = currentState.list.sort((a,b)=>{return a.name < b.name ? -1 : 1;})
            currentState.filters = Array.from(new Set(currentState.list.map(image => image.tags).flat().sort()))
            invalidate(GALLERY)
            invalidate(FILTER)
            if (currentState.list.length) {
                let hashIndex = currentState.list.findIndex(image => image.hash === currentState.hash)
                if (hashIndex == -1) hashIndex = 0
                currentState.hash = currentState.list[hashIndex].hash
                currentState.color = currentState.list[hashIndex].dominantColor
            }
            updateColors()
        }

        // ABOUT

        function makeAbout() {
            const aboutContainer = document.createElement('section')
            aboutContainer.classList.add("about")
            aboutContainer.append(makeFromTemplate(aboutTemplate, {name: currentState.name}))
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
                document.body.addEventListener('keydown', onKeyDown)
            }
            aboutContainer.detach = () => {
                document.body.removeEventListener('keydown', onKeyDown)
             }

            return aboutContainer
        }
        viewGenerators.set(ABOUT, makeAbout)


        function makeSpinner(ref, cls) {
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

        function makeDetailLoader(color) {
            return makeSpinner(color, ["large", "delay-in"])
        }

        function makeGalleryLoader(color) {
            const loaderContainer = document.createElement('div')
            loaderContainer.classList.add("loader-container")
            loaderContainer.appendChild(makeSpinner(color, ["small", "delay-0"]))
            loaderContainer.appendChild(makeSpinner(color, ["small", "delay-1"]))
            loaderContainer.appendChild(makeSpinner(color, ["small", "delay-2"]))
            loaderContainer.destroy = () => {}
            return loaderContainer
        }

        // GALLERY

        function makeGallery() {
            list = currentState.list
            const galleryContainer = document.createElement("section")
            galleryContainer.classList.add("gallery")

            const loaderContainer = makeGalleryLoader(currentState.color)

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
                    },100)
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
        
                        const mc = new Hammer.Manager(imgElem, {})
                        mc.add(new Hammer.Tap())
                        mc.on("tap", (ev)=>{
                            navigate(DETAIL, {hash: imgElem.hash})
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
        viewGenerators.set(GALLERY, makeGallery)



        // DETAIL

        function makeDetail() {
            let list = currentState.list
            let index = getIndexOfHash(currentState.hash)
            index = wrap(list, index)

            currentState.color = list[index].dominantColor
            updateColors()

            const detailContainer = document.createElement("section")
            detailContainer.classList.add("detail")
            
            const imgContainer = document.createElement("div")
            imgContainer.classList.add("image-container")

            detailContainer.append(imgContainer)

            const makeImage = (list, index) => {
                const image = list[index]
                const container = document.createElement("div")
                container.classList.add("image-group")
                const imgElem = document.createElement("img")
                imgElem.style.opacity = 0
                imgElem.setAttribute('loading', 'eager')
                imgElem.classList.add("image")

                const loaderElem = makeDetailLoader(image.dominantColor)
                container.append(loaderElem)
                const onLoad = (ev) => {
                    loaderElem.remove()
                    container.append(imgElem)
                    setTimeout(()=>{
                        if (imgElem) {

                            imgElem.style.transition = "opacity ease-in 0.5s";
                            imgElem.style.opacity = 1.0
                        }
                    }, 100)
                }
                imgElem.addEventListener("load", onLoad)
                imgElem.src = image.src
                container.index = index
                container.destroy = () => {
                    imgElem.removeEventListener("load", onLoad)
                    imgElem.src = ''
                    imgElem.onload = null
                    imgElem.onerror = null
                    imgElem.remove()
                }
                return container
            }

            const preload = () => {
                // optimized load order
                let order = []
                order[2] = makeImage(list, index)
                order[3] = makeImage(list, wrap(list,index+1))
                order[1] = makeImage(list, wrap(list,index-1))
                order[4] = makeImage(list, wrap(list,index+2))
                order[0] = makeImage(list, wrap(list,index-2))
                imgContainer.append(...order)
            }
            preload()


            infoElem.innerText = `${list[index].name}`

            const mc = new Hammer.Manager(detailContainer, {})
            mc.add(new Hammer.Pan({direction: Hammer.DIRECTION_HORIZONTAL}))
          
            let offset = -2
            imgContainer.style.marginLeft = `${(offset)*100}%`
            let panOffset = 0
            let transition = 0
            mc.on("panstart", (ev)=>{
                if (!transition) {
                    panOffset = 0
                    imgContainer.style.transition = `unset`
                }
            })
            mc.on("panmove", (ev)=>{
                if (!transition) {
                    const w = imgContainer.getBoundingClientRect().width
                    panOffset = ev.deltaX/w
                    imgContainer.style.marginLeft = `${(offset + panOffset)*100}%`
                }
            })
            
            let panTarget = 0
            mc.on("panend", (ev)=>{
                if (!transition) {
                    if (panOffset >= .10) {
                        offset++
                        index = wrap(list, --index)
                    } else if (panOffset <= -.10) {
                        offset--
                        index = wrap(list, ++index)
                    }
                    infoElem.innerText = `${list[index].name}`
                    currentState.hash = list[index].hash
                    currentState.color = list[index].dominantColor
                    updateColors()
                    saveState()
                    imgContainer.style.transitionDuration = `${Math.abs((1-panOffset)*.5)}s`
                    imgContainer.style.transitionTimingFunction = 'ease-out'
                    imgContainer.style.marginLeft = `${offset*100}%`
                    transition++
                }
            })
            const onTransitionEnd = (ev) => {
                if(ev.target !== imgContainer) return
                transition--
                manage()
            }
            imgContainer.addEventListener('transitionend', onTransitionEnd)
            const manage = () => {
                let prepended = false
                let appended = false
                while (offset >= -1) {
                    imgContainer.prepend(makeImage(list, wrap(list,imgContainer.children[0].index-1)))
                    offset--
                    prepended = true
                }
                if (!prepended) {
                    while (offset <= -(imgContainer.children.length-2)) {
                        imgContainer.append(
                            makeImage(
                                list, 
                                wrap(list,imgContainer.children[imgContainer.children.length-1].index+1)
                            )
                        )
                        appended = true
                    }
                }
                if (imgContainer.children.length >= 15) {
                    while (imgContainer.children.length >= 10) {
                        let child
                        if (appended) {
                            child = imgContainer.children[0]
                            offset++
                        } else {
                            child = imgContainer.children[imgContainer.children.length-1]
                        }
                        child.destroy()
                        imgContainer.removeChild(child)
                    }
                }
                imgContainer.style.transition = 'unset'
                imgContainer.style.marginLeft = `${offset*100}%`
            }
            const onKeyDown = (event) => {
                const key = event.key; // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
                switch (key) {
                    case "Left": // IE/Edge specific value
                    case "ArrowLeft": 
                        if (!transition) {
                            offset++
                            index = wrap(list, --index)
                            infoElem.innerText = `${list[index].name}`
                            currentState.hash = list[index].hash
                            currentState.color = list[index].dominantColor
                            updateColors()
                            saveState()
                            imgContainer.style.transitionDuration = `${.7}s`
                            imgContainer.style.transitionTimingFunction = 'ease-in'
                            imgContainer.style.marginLeft = `${offset*100}%`
                            transition++
                        } 
                      
                        break;
                    case "Right": // IE/Edge specific value
                    case "ArrowRight":
                        if (!transition) {
                            --offset
                            index = wrap(list, ++index)
                            infoElem.innerText = `${list[index].name}`
                            currentState.hash = list[index].hash
                            currentState.color = list[index].dominantColor
                            updateColors()
                            saveState()
                            imgContainer.style.transitionDuration = `${.7}s`
                            imgContainer.style.transitionTimingFunction = 'ease-in'
                            imgContainer.style.marginLeft = `${offset*100}%`
                            transition++
                        }
                     
                      break;
                    case "Esc": // IE/Edge specific value
                    case "Escape":
                        navigate(GALLERY)
                        break;
                }
            }
            document.body.addEventListener('keydown', onKeyDown)
            detailContainer.destroy = () => {
                imgContainer.removeEventListener('transitionend', onTransitionEnd)
                document.body.removeEventListener('keydown', onKeyDown)
                mc.destroy()
                while (imgContainer.firstChild) {
                    imgContainer.firstChild.destroy()
                    imgContainer.removeChild(imgContainer.firstChild)
                }
            }
            detailContainer.noCache = true
            return detailContainer
        }
        viewGenerators.set(DETAIL, makeDetail)



        // FILTER

        function makeFilter() {
            const fllen = currentState.list.length
            const fllenStr = fllen==0?"no":fllen
            const imageStr = fllen<=1?'image':'images'
            const fltlen = currentState.tags.length
            infoElem.innerText = `${fllenStr} ${imageStr} found`
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
            currentState.filters.forEach((filter) => {
                const meta = data.tags[filter]
                const filterElem = document.createElement("button")
                filterElem.classList.add("filter")
                const mc = new Hammer.Manager(filterElem, {})
                mc.add(new Hammer.Tap()) 
                mc.on("tap", (ev)=>{
                    const filterindex = currentState.tags.indexOf(filter)
                    if (filterindex != -1) {
                        currentState.tags.splice(filterindex,1)
                    } else {
                        currentState.tags.push(filter)
                    }
                    applyFilters()
                    navigate(FILTER)
                })
                filterElem.destroy = () => {
                    mc.destroy()
                }
                filterElem.innerText = `${filter}`
                filterElem.style.backgroundColor = `rgba(${meta.dominantColor.r},${meta.dominantColor.g},${meta.dominantColor.b},.9)`
                filterElem.style.color = isBright(meta.dominantColor)?'black':'white'
                if (currentState.tags.indexOf(filter) != -1) {
                    filterElem.classList.add("selected")
                    selectionContainer.append(filterElem)
                } else {
                    optionsContainer.append(filterElem)
                }
                if (currentState.tags.length) filterContainer.appendChild(selectionContainer)
                if (currentState.tags.length - currentState.filters.length) filterContainer.appendChild(optionsContainer)
            })
            const onKeyDown = (event) => {
                const key = event.key
                switch (key) {
                    case "Esc": // IE/Edge specific value
                    case "Escape":
                        navigate(GALLERY)
                        break
                }
            }
            filterContainer.attach = () => {
                document.body.addEventListener('keydown', onKeyDown)
            }
            filterContainer.detach = () => {
               document.body.removeEventListener('keydown', onKeyDown)
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
        viewGenerators.set(FILTER, makeFilter)

        // KICK IT
        initialize()
    }

    function load(src) {
        return fetch(src).then(response => response.json())
    }
    
    document.addEventListener("DOMContentLoaded", (e)=>{
        load('generated/data.json').then(makeApp)
    })
})()