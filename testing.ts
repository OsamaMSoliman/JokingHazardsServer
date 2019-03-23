let t = setTimeout(() => {
    clearTimeout(t)
}, 1000);