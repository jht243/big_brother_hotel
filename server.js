const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// SQLite setup
const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'waitlist.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.run(`CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            ab_variant TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS page_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT,
            user_agent TEXT,
            referrer TEXT,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            page_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});

// Serve frontend files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API Endpoints
app.post('/api/waitlist', (req, res) => {
    const { name, email, ab_headline_variant } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const stmt = db.prepare('INSERT INTO leads (name, email, ab_variant) VALUES (?, ?, ?)');
    stmt.run([name, email, ab_headline_variant], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Successfully joined the waitlist', leadId: this.lastID });
    });
    stmt.finalize();
});

app.post('/api/pageview', (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const { referrer, utm_source, utm_medium, utm_campaign, page_url } = req.body;

    const stmt = db.prepare(`INSERT INTO page_views 
        (ip_address, user_agent, referrer, utm_source, utm_medium, utm_campaign, page_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
        
    stmt.run([ip, userAgent, referrer, utm_source, utm_medium, utm_campaign, page_url], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, viewId: this.lastID });
    });
    stmt.finalize();
});

app.get('/api/stats', (req, res) => {
    const stats = {
        totalLeads: 0,
        totalPageViews: 0,
        variants: {},
        recentLeads: [],
        recentPageViews: []
    };

    let queriesCompleted = 0;
    const checkDone = () => {
        queriesCompleted++;
        if (queriesCompleted === 5) {
            res.json(stats);
        }
    };

    db.get('SELECT COUNT(*) as count FROM leads', (err, row) => {
        if (!err) stats.totalLeads = row.count;
        checkDone();
    });

    db.get('SELECT COUNT(*) as count FROM page_views', (err, row) => {
        if (!err) stats.totalPageViews = row.count;
        checkDone();
    });

    db.all('SELECT ab_variant, COUNT(*) as count FROM leads GROUP BY ab_variant', (err, rows) => {
        if (!err) {
            rows.forEach(row => {
                const variant = row.ab_variant || 'Unknown';
                stats.variants[variant] = row.count;
            });
        }
        checkDone();
    });

    db.all('SELECT * FROM leads ORDER BY created_at DESC LIMIT 50', (err, rows) => {
        if (!err) stats.recentLeads = rows;
        checkDone();
    });

    db.all('SELECT * FROM page_views ORDER BY created_at DESC LIMIT 50', (err, rows) => {
        if (!err) stats.recentPageViews = rows;
        checkDone();
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
