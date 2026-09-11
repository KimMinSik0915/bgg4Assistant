export const BackgroundColor = (location) => {
    if(!location) {
        console.warn('Background Color is not Selected');
        return '#0a0118'
    }
    switch(location.pathname) {
        default :
            return '#0a0118';
    }
}