-- A request reserves one of Ina's slots until staff confirms or cancels it.
-- The linked enquiry is created in the same transaction and owns the personal data.
CREATE TABLE group_appointments (
  request_id uuid PRIMARY KEY REFERENCES enquiries(request_id) DEFERRABLE INITIALLY DEFERRED,
  starts_at timestamptz NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE group_appointments IS
  'Ina appointment requests; delete a reservation only after staff cancels it in the enquiry trail.';
