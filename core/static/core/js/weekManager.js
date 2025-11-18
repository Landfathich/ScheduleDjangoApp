import {formatDate} from "./utils.js";

export class WeekManager {
    constructor() {
        this.currentWeekOffset = 0;
    }

    getDayOfWeek(date) {
        return ['sunday', 'monday', 'tuesday', 'wednesday',
            'thursday', 'friday', 'saturday'][date.getDay()];
    }

    getWeekDates(offset = 0) {
        const today = new Date();
        const currentDay = today.getDay();
        // Воскресенье (0) становится 6, чтобы правильно вычислить понедельник
        const diff = currentDay === 0 ? 6 : currentDay - 1;

        const monday = new Date(today);
        monday.setDate(today.getDate() - diff + (offset * 7));

        return Array.from({length: 7}, (_, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            return date;
        });
    }

    updateHeaderDates() {
        const dates = this.getWeekDates(this.currentWeekOffset);
        const dateElements = document.querySelectorAll('.date');
        const dayHeaders = document.querySelectorAll('.day-header');

        const today = new Date();
        const currentDate = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        dateElements.forEach((element, index) => {
            const displayedDate = dates[index]; // Используем уже вычисленные даты из getWeekDates
            element.textContent = formatDate(displayedDate);

            // Проверяем, является ли день текущим
            const isCurrentDay = displayedDate.getDate() === currentDate &&
                displayedDate.getMonth() === currentMonth &&
                displayedDate.getFullYear() === currentYear;

            dayHeaders[index].classList.toggle('current-day', isCurrentDay);
        });
    }

    updateWeekInfo() {
        const dates = this.getWeekDates(this.currentWeekOffset);
        const [monday, sunday] = [dates[0], dates[6]]; // Первый и последний день недели

        const weekRangeElement = document.getElementById('week-range');
        weekRangeElement.textContent = `${formatDate(monday)} - ${formatDate(sunday)}`;
    }

    getWeekRange(offset = 0) {
        const today = new Date();
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? 6 : currentDay - 1; // Коррекция для воскресенья

        const monday = new Date(today);
        monday.setDate(today.getDate() - diff + (offset * 7));

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return {start: monday, end: sunday};
    }
}