exports.up = (pgm) => {
  pgm.createTable("sessions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    token: {
      type: "varchar(96)", // same as facebook
      notNull: true,
      unique: true,
    },

    user_id: {
      type: "uuid",
      notNull: true,
      // references: '"users"', // let's not do this to see it will indeed be an issue in the future
    },

    created_at: {
      type: "timestamptz",
      default: pgm.func("timezone('utc', now())"),
      notNull: true,
    },

    expires_at: {
      type: "timestamptz",
      notNull: true,
    },

    updated_at: {
      type: "timestamptz",
      default: pgm.func("timezone('utc', now())"),
      notNull: true,
    },
  });
};

exports.down = false;
