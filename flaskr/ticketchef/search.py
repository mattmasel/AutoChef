from rapidfuzz import fuzz

def score_keywords(query, keywords):
    """Compares user query with keyword strings in DB. Returns similarity score."""
    query = query.lower().strip()
    keywords = keywords.lower().strip()

    if len(query.split()) < 2:
        return 0
    
    sort_score = fuzz.token_sort_ratio(query, keywords)
    set_score = fuzz.token_set_ratio(query, keywords)
    
    return (sort_score * 0.4) + (set_score * 0.6)

def find_best_match(query, rows):
    """Finds the best matching solution row."""
    best_score = 0
    best_row = None

    for row in rows:

        score = score_keywords(
            query,
            row["Keywords"]
        )

        if score > best_score:
            best_score = score
            best_row = row

    return best_row, best_score
