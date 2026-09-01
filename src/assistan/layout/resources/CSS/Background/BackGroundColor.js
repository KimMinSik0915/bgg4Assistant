export const BackgroundColor = (location) => {
    if(!location) {
        console.warn('Background Color is not Selected');
        return '#020617'
    }
    switch(location.pathname) {
        default :
            return '#020617';
    }
}