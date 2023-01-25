const path = require("path");
const fsPromises = require("fs/promises");
const {
  fileExists,
  readJsonFile,
  deleteFile,
  getDirectoryFileNames,
} = require("../utils/fileHandling");
const { GraphQLError, printType } = require("graphql");
const crypto = require("crypto");

const axios = require("axios").default;

const cartDirectory = path.join(__dirname, "..", "data", "shoppingcarts");
const productDirectory = path.join(__dirname, "..", "data", "products");

exports.resolvers = {
  Query: {
    getCartById: async (_, args) => {
      const cartId = args.cartId;
      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      //check if cart exists
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");
      // get data from file
      const cartData = await readJsonFile(cartFilePath);
      const data = JSON.parse(cartData);
      return data;
    },
  },
  Mutation: {
    addItemToCart: async (_, args) => {
      const { cartId, productId } = args;

      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const cartData = await readJsonFile(cartFilePath);

      const data = JSON.parse(cartData);

      let itemInCartExist = false;
      // check if produkten exists in cart and if so increase quantity:
      for (let x of data.items) {
        if (x.id === productId) {
          x.quantity++;
          itemInCartExist = true;
        }
      }
      // if product is not in cart already:
      if (!itemInCartExist) {
        const productFilePath = path.join(
          productDirectory,
          `${productId}.json`
        );
        // Check if the requested prododuct actually exists
        const productExists = await fileExists(productFilePath);
        // If product does not exist return an error notifying the user of this
        if (!productExists)
          return new GraphQLError("That product does not exist");

        // Read the product file; data will be returned as a JSON string
        const itemData = await readJsonFile(productFilePath);
        // Parse the returned JSON product data into a JS object
        const productData = JSON.parse(itemData);
        const newCartItem = {
          id: productData.id,
          name: productData.name,
          price: productData.price,
          quantity: 1,
        };

        // push newCartItem in to shoppingcart cartitem-list
        data.items.push(newCartItem);
      }
      //update totalprice for cart:
      let sum = 0;
      for (let x of data.items) {
        sum += x.quantity * x.price;
      }

      data.totalprice = sum;
      //update cart:
      await fsPromises.writeFile(cartFilePath, JSON.stringify(data));
      // return updated cart
      return data;
    },

    createCart: async () => {
      const newCart = {
        id: crypto.randomUUID(),
        items: [],
        totalprice: 0,
      };

      let filePath = path.join(
        __dirname,
        "..",
        "data",
        "shoppingcarts",
        `${newCart.id}.json`
      );
      // kolla om filen existerar
      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);
        console.log(exists, newCart.id);
        // om filen redan existerar generera ett nytt cartId och uppdatera filePath
        if (exists) {
          newCart.id = crypto.randomUUID();
          filePath = path.join(cartDirectory, `${newCart.id}.json`);
        }
        // uppdatera idExists (för att undvika infinite loops)
        idExists = exists;
      }

      // Skapa en fil för cart i /data/projects
      await fsPromises.writeFile(filePath, JSON.stringify(newCart));

      // Return:a våran respons; vår nya shoppingcart
      return newCart;
    },

    createProduct: async (_, args) => {
      // skapa nya produkter till shoppen
      const { name, description, price } = args;

      const newProduct = {
        id: crypto.randomUUID(),
        name: args.name,
        description: args.description || "",
        price: args.price,
      };
      let filePath = path.join(
        __dirname,
        "..",
        "data",
        "products",
        `${newProduct.id}.json`
      );
      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath); // kolla om filen existerar
        console.log(exists, newProduct.id);
        // om filen redan existerar generera ett nytt productId och uppdatera filePath
        if (exists) {
          newProduct.id = crypto.randomUUID();
          filePath = path.join(productDirectory, `${newProduct.id}.json`);
        }
        // uppdatera idExists (för att undvika infinite loops)
        idExists = exists;
      }
      await fsPromises.writeFile(filePath, JSON.stringify(newProduct));

      // Return our new product
      return newProduct;
    },

    removeItemFromCart: async (_, args) => {
      const { cartId, cartItemId } = args;

      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const cartData = await fsPromises.readFile(cartFilePath, {
        encoding: "utf-8",
      });

      const data = JSON.parse(cartData);

      let itemInCartExist = false;
      // check if produkten already exist in cart and if so reduce quantity and if quantity=0 remove from items-list:

      for (let i = 0; i < data.items.length; i++) {
        if (data.items[i].id === cartItemId) {
          data.items[i].quantity--;
          itemInCartExist = true;
          if (data.items[i].quantity === 0) {
            console.log(data.items[i].quantity);
            data.items.splice(i, 1);
          }
        }
      }

      // if product is not in cart already:
      if (!itemInCartExist) {
        return new GraphQLError("That product does not exist in this cart");
      }
      //update totalprice for cart:
      let sum = 0;
      for (let x of data.items) {
        sum += x.quantity * x.price;
      }

      data.totalprice = sum;
      //update cart:
      await fsPromises.writeFile(cartFilePath, JSON.stringify(data));
      return data;
    },

    deleteCart: async (_, args) => {
      const { cartId } = args;

      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      // check if file cartexist
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      try {
        await deleteFile(cartFilePath);
      } catch (error) {
        return {
          deletedId: cartId,
          success: false,
        };
      }

      return {
        deletedId: cartId,
        success: true,
      };
    },
  },
};
