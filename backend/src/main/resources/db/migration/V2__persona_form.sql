ALTER TABLE profiles ADD COLUMN site_phone VARCHAR(40);
UPDATE profiles
SET site_phone = (SELECT site_phone FROM site_settings WHERE id = 1)
WHERE site_phone IS NULL;
ALTER TABLE profiles ALTER COLUMN ethnicity DROP NOT NULL;
