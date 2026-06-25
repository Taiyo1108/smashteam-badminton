CREATE TABLE recruitment_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE casting_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES recruitment_campaigns(id) ON DELETE CASCADE,
    casting_time TIMESTAMP NOT NULL,
    location VARCHAR(255) NOT NULL,
    max_capacity INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users 
ADD COLUMN casting_slot_id UUID REFERENCES casting_slots(id) ON DELETE SET NULL;
