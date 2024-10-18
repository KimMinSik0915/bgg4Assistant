export const BackgroundColor = (location) => {
    if(!location) {
        console.warn('Background Color is not Selected');
        return '#d9d9f2'
    }
    switch(location.pathname) {
        case '/' :
            return '#d9d9f2';
        default :
            return '#d9d9f2';
    }
}