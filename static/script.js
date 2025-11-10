class RecipeDashboard {
    constructor() {
        this.currentPage = 1;
        this.limit = 15;
        this.totalPages = 1;
        this.currentFilters = {};
        this.isSearchMode = false;
        this.initializeEventListeners();
        this.loadRecipes();
    }
    initializeEventListeners() {
        document.getElementById('prevBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('limit').addEventListener('change', (e) => {
            this.limit = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadRecipes();
        });
        document.getElementById('searchBtn').addEventListener('click', () => this.searchRecipes());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearFilters());
        document.getElementById('closeDrawer').addEventListener('click', () => this.closeDrawer());
        document.getElementById('expandTime').addEventListener('click', () => this.toggleTimeDetails());
        const searchInputs = document.querySelectorAll('.filter-group input');
        searchInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchRecipes();
                }
            });
        });
    }
    async loadRecipes() {
        this.showLoading(true);
        this.hideNoData();
        try {
            const response = await fetch(`/api/recipes?page=${this.currentPage}&limit=${this.limit}`);
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            this.displayRecipes(data);
            this.updatePagination(data);
        } catch (error) {
            console.error('Error loading recipes:', error);
            this.showError('Failed to load recipes');
        } finally {
            this.showLoading(false);
        }
    }
    async searchRecipes() {
        this.currentPage = 1;
        this.isSearchMode = true;
        this.currentFilters = {};
        const titleFilter = document.getElementById('titleFilter').value.trim();
        const cuisineFilter = document.getElementById('cuisineFilter').value.trim();
        const ratingFilter = document.getElementById('ratingFilter').value.trim();
        const caloriesFilter = document.getElementById('caloriesFilter').value.trim();
        const timeFilter = document.getElementById('timeFilter').value.trim();
        if (titleFilter) this.currentFilters.title = titleFilter;
        if (cuisineFilter) this.currentFilters.cuisine = cuisineFilter;
        if (ratingFilter) this.currentFilters.rating = ratingFilter;
        if (caloriesFilter) this.currentFilters.calories = caloriesFilter;
        if (timeFilter) this.currentFilters.total_time = timeFilter;
        if (Object.keys(this.currentFilters).length === 0) {
            this.clearFilters();
            return;
        }
        this.performSearch();
    }
    async performSearch() {
        this.showLoading(true);
        this.hideNoData();
        try {
            const params = new URLSearchParams(this.currentFilters);
            const response = await fetch(`/api/recipes/search?${params}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            this.displayRecipes(data, true);
            this.updateSearchPagination(data.data.length);
        } catch (error) {
            console.error('Error searching recipes:', error);
            this.showError('Failed to search recipes');
        } finally {
            this.showLoading(false);
        }
    }
    clearFilters() {
        document.getElementById('titleFilter').value = '';
        document.getElementById('cuisineFilter').value = '';
        document.getElementById('ratingFilter').value = '';
        document.getElementById('caloriesFilter').value = '';
        document.getElementById('timeFilter').value = '';
        this.currentFilters = {};
        this.isSearchMode = false;
        this.currentPage = 1;
        this.loadRecipes();
    }
    displayRecipes(data, isSearch = false) {
        const tableBody = document.getElementById('recipesTableBody');
        const recipes = isSearch ? data.data : data.data;
        if (recipes.length === 0) {
            this.showNoData();
            tableBody.innerHTML = '';
            return;
        }
        tableBody.innerHTML = recipes.map(recipe => `
            <tr data-recipe-id="${recipe._id.$oid || recipe._id}">
                <td class="title-cell" title="${recipe.title}">${this.truncateText(recipe.title, 40)}</td>
                <td>${recipe.cuisine || 'N/A'}</td>
                <td>${this.renderStarRating(recipe.rating)}</td>
                <td>${recipe.total_time || 'N/A'}</td>
                <td>${recipe.serves || 'N/A'}</td>
            </tr>
        `).join('');
        tableBody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', () => {
                const recipeId = row.getAttribute('data-recipe-id');
                this.showRecipeDetails(recipeId);
            });
        });
    }
    async showRecipeDetails(recipeId) {
        try {
            const response = await fetch(`/api/recipes/${recipeId}`);
            const recipe = await response.json();
            
            if (recipe.error) {
                throw new Error(recipe.error);
            }
            
            this.populateDrawer(recipe);
            this.openDrawer();
            
        } catch (error) {
            console.error('Error loading recipe details:', error);
            alert('Failed to load recipe details');
        }
    }
    populateDrawer(recipe) {
        document.getElementById('drawerTitle').textContent = recipe.title;
        document.getElementById('drawerCuisine').textContent = recipe.cuisine || 'Unknown Cuisine';
        document.getElementById('drawerDescription').textContent = recipe.description || 'No description available.';
        document.getElementById('drawerTotalTime').textContent = recipe.total_time ? `${recipe.total_time} minutes` : 'N/A';
        document.getElementById('drawerPrepTime').textContent = recipe.prep_time ? `${recipe.prep_time} minutes` : 'N/A';
        document.getElementById('drawerCookTime').textContent = recipe.cook_time ? `${recipe.cook_time} minutes` : 'N/A';
        this.populateNutritionTable(recipe.nutrients);
        this.populateList('drawerIngredients', recipe.ingredients || []);
        this.populateList('drawerInstructions', recipe.instructions || [], true);
    }
    populateNutritionTable(nutrients) {
        const tableBody = document.getElementById('nutritionTableBody');
        const nutrientMap = {
            calories: 'Calories',
            carbohydrateContent: 'Carbohydrates',
            cholesterolContent: 'Cholesterol',
            fiberContent: 'Fiber',
            proteinContent: 'Protein',
            saturatedFatContent: 'Saturated Fat',
            sodiumContent: 'Sodium',
            sugarContent: 'Sugar',
            fatContent: 'Fat',
            unsaturatedFatContent: 'Unsaturated Fat'
        };
        tableBody.innerHTML = Object.entries(nutrientMap)
            .filter(([key]) => nutrients && nutrients[key])
            .map(([key, label]) => `
                <tr>
                    <td><strong>${label}:</strong></td>
                    <td>${nutrients[key]}</td>
                </tr>
            `).join('') || '<tr><td colspan="2">No nutrition information available.</td></tr>';
    }
    populateList(elementId, items, isOrdered = false) {
        const element = document.getElementById(elementId);
        if (items.length === 0) {
            element.innerHTML = '<li>No information available.</li>';
            return;
        }
        element.innerHTML = items.map(item => 
            `<li>${item}</li>`
        ).join('');
    }
    renderStarRating(rating) {
        if (!rating) return 'N/A';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return `<span class="star-rating">${stars} (${rating})</span>`;
    }
    truncateText(text, maxLength) {
        if (!text) return 'N/A';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    updatePagination(data) {
        this.totalPages = Math.ceil(data.total / this.limit);
        document.getElementById('pageInfo').textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        
        document.getElementById('prevBtn').disabled = this.currentPage === 1;
        document.getElementById('nextBtn').disabled = this.currentPage === this.totalPages;
    }
    updateSearchPagination(resultCount) {
        this.totalPages = Math.ceil(resultCount / this.limit);
        document.getElementById('pageInfo').textContent = `Search Results - Page ${this.currentPage} of ${this.totalPages}`;
        
        document.getElementById('prevBtn').disabled = this.currentPage === 1;
        document.getElementById('nextBtn').disabled = this.currentPage === this.totalPages || resultCount === 0;
    }
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            if (this.isSearchMode) {
                this.performSearch();
            } else {
                this.loadRecipes();
            }
        }
    }
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            if (this.isSearchMode) {
                this.performSearch();
            } else {
                this.loadRecipes();
            }
        }
    }
    openDrawer() {
        document.getElementById('recipeDrawer').classList.add('open');
    }
    closeDrawer() {
        document.getElementById('recipeDrawer').classList.remove('open');
    }
    toggleTimeDetails() {
        const timeDetails = document.getElementById('timeDetails');
        const expandBtn = document.getElementById('expandTime');
        
        timeDetails.classList.toggle('hidden');
        expandBtn.innerHTML = timeDetails.classList.contains('hidden') ? 
            '<i class="fas fa-chevron-down"></i>' : 
            '<i class="fas fa-chevron-up"></i>';
    }
    showLoading(show) {
        document.getElementById('loading').classList.toggle('hidden', !show);
    }
    showNoData() {
        document.getElementById('noData').classList.remove('hidden');
    }
    hideNoData() {
        document.getElementById('noData').classList.add('hidden');
    }
    showError(message) {
        alert(message);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new RecipeDashboard();
});