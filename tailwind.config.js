/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            backgroundImage: {
                JobPostingHero: "url('/imgs/jobpostings-header-final.png')",
                HumanoidHero: "url('/imgs/jobpostings-header-final.png')", //TODO replace with humanoid image
                ModalRight:
                    "linear-gradient(168.88deg, #1F5D96 -1.63%, rgba(31, 93, 150, 0.885417) 23.91%, rgba(31, 93, 150, 0) 146.98%)",
                TopGradient:
                    "linear-gradient(180deg, rgba(0, 0, 0, 0.65) 5%, rgba(0, 0, 0, 0) 20%)",
                search: "url('/imgs/search.svg')",
                main: "url('/imgs/bg.jpg')",
                network: "url('/imgs/network.png')",
                badge: "linear-gradient(135deg, #1F5D96 20%, #46A3B1 80%)",
                VideoPlaceholder: "url('/imgs/video_thumb_pioneer.jpg')",
            },
            boxShadow: {
                NoOffset: "0 0px 25px -5px black",
            },
            colors: {
                "wato-blue": {
                    DEFAULT: "#1F5D96",
                    hover: "#4A7EB3",
                    gloomy: "#BCCEE0",
                    water: "#D3E3F3",
                },
                "wato-teal": {
                    DEFAULT: "#66DDC8",
                },
                "wato-white": {
                    bone: "#F6F8FA",
                },
                "wato-grey": {
                    DEFAULT: "#A6A6A6",
                    clear: "#E6E2DF8C",
                    porcelain: "#EBEDEF",
                },
                "wato-black": {
                    DEFAULT: "#2D2727",
                    vanta: "#0A0A0A",
                },
            },
        },
    },
    plugins: [require("@tailwindcss/typography")],
};

