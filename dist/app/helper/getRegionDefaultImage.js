"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegionDefaultImage = void 0;
const getRegionDefaultImage = (region) => {
    const images = {
        'Europe': 'https://images.unsplash.com/photo-1471306224500-6d0d218be372?q=80&w=300',
        'Asia': 'https://images.unsplash.com/photo-1464817739973-0128fe77aaa1?q=80&w=300',
        'Americas': 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&q=80&w=600',
        'Africa': 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=300',
    };
    return images[region] || images['Europe'];
};
exports.getRegionDefaultImage = getRegionDefaultImage;
