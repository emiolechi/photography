const shuffle = (arr, tms) => {
    Array.from(Array(tms)).forEach(() => arr.sort(() => 0.5 - Math.random()))
    return arr
}

Array.from(Array(10)).map(
    () => console.log(shuffle("aimee nicholas".split(''), 100).join(''))
)
    