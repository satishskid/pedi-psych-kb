-- Migration script to add missing tables for book-structure endpoint

-- Create ratings table
CREATE TABLE ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(card_id, user_id)
);

-- Create content_permissions table (simplified version for book-structure query)
CREATE TABLE content_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    policy_id INTEGER,
    access_level TEXT DEFAULT 'read',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id),
    FOREIGN KEY (policy_id) REFERENCES policies(id)
);

-- Create indexes for ratings table
CREATE INDEX idx_ratings_card_id ON ratings(card_id);
CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_ratings_rating ON ratings(rating);

-- Create indexes for content_permissions
CREATE INDEX idx_content_permissions_card_id ON content_permissions(card_id);
CREATE INDEX idx_content_permissions_policy_id ON content_permissions(policy_id);

-- Insert some sample ratings for testing
INSERT INTO ratings (card_id, user_id, rating, comment) VALUES 
(1, 1, 5, 'Excellent resource for anxiety management'),
(2, 1, 4, 'Very comprehensive ADHD guidelines'),
(3, 2, 5, 'Great screening tools'),
(4, 3, 4, 'Helpful autism support information'),
(5, 1, 5, 'Excellent behavioral interventions');

-- Create sample content permissions (optional, for testing)
INSERT INTO content_permissions (card_id, policy_id, access_level) VALUES 
(1, 1, 'read'),
(2, 1, 'read'),
(3, 2, 'read'),
(4, 3, 'read'),
(5, 1, 'read');